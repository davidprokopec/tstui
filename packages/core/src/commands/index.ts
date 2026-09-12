import { Context, Effect, Layer, Queue, Schema, Stream } from "effect";
import { CommandError } from "../domain/errors.js";
import type { AppState } from "../domain/model.js";
import { EventBus, ProjectionService } from "../state.js";
import { TeamSpeakPort } from "../ports/teamspeak.js";

export const CommandInvocation = Schema.Struct({
  id: Schema.String,
  args: Schema.Record(Schema.String, Schema.String),
});
export interface CommandInvocation extends Schema.Schema.Type<
  typeof CommandInvocation
> {}
export interface CommandMetadata {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly args: Schema.Schema<object>;
  readonly enabled: (state: AppState) => boolean;
}

const NoArgs = Schema.Struct({});
const ConnectArgs = Schema.Struct({
  server: Schema.String,
  nickname: Schema.String,
});
const ChannelArgs = Schema.Struct({ channelId: Schema.String });
const MessageArgs = Schema.Struct({
  targetId: Schema.String,
  body: Schema.String,
});
const PrivateChatArgs = Schema.Struct({ targetId: Schema.String });
const NicknameArgs = Schema.Struct({ nickname: Schema.String });

const selectedChannelIndex = (state: AppState): number =>
  state.channels.findIndex((channel) => channel.id === state.selectedChannelId);

const treeFocused = (state: AppState): boolean =>
  state.phase === "connected" && state.focus === "tree";

export const commandRegistry: ReadonlyArray<CommandMetadata> = [
  {
    id: "focus-next",
    title: "Focus next",
    description: "Move focus to the next panel",
    args: NoArgs,
    enabled: (s) => s.phase === "connected",
  },
  {
    id: "focus-prev",
    title: "Focus previous",
    description: "Move focus to the previous panel",
    args: NoArgs,
    enabled: (s) => s.phase === "connected",
  },
  {
    id: "tree-up",
    title: "Previous channel",
    description: "Move the tree cursor up",
    args: NoArgs,
    enabled: (s) => treeFocused(s) && selectedChannelIndex(s) >= 0,
  },
  {
    id: "tree-down",
    title: "Next channel",
    description: "Move the tree cursor down",
    args: NoArgs,
    enabled: (s) => treeFocused(s) && selectedChannelIndex(s) >= 0,
  },
  {
    id: "connect",
    title: "Connect",
    description: "Connect to a server",
    args: ConnectArgs,
    enabled: (s) => s.phase === "disconnected",
  },
  {
    id: "disconnect",
    title: "Disconnect",
    description: "Disconnect manually",
    args: NoArgs,
    enabled: (s) => s.phase !== "disconnected",
  },
  {
    id: "select-channel",
    title: "Select channel",
    description: "Select a chat target",
    args: ChannelArgs,
    enabled: (s) => s.phase === "connected",
  },
  {
    id: "join-channel",
    title: "Join channel",
    description: "Move to a channel",
    args: NoArgs,
    enabled: (s) =>
      treeFocused(s) &&
      s.selectedChannelId !== null &&
      s.channels.some((channel) => channel.id === s.selectedChannelId),
  },
  {
    id: "send-message",
    title: "Send message",
    description: "Send channel text",
    args: MessageArgs,
    enabled: (s) => s.phase === "connected",
  },
  {
    id: "open-private-chat",
    title: "Open private chat",
    description: "Unavailable until private chat UI is implemented",
    args: PrivateChatArgs,
    enabled: () => false,
  },
  {
    id: "set-nickname",
    title: "Set nickname",
    description: "Change nickname",
    args: NicknameArgs,
    enabled: (s) => s.phase === "connected",
  },
  {
    id: "quit",
    title: "Quit",
    description: "Exit tstui",
    args: NoArgs,
    enabled: () => true,
  },
];

const required = (
  args: Readonly<Record<string, string>>,
  key: string,
): Effect.Effect<string, CommandError> => {
  const value = args[key];
  return value === undefined || value === ""
    ? new CommandError({ message: `Missing argument: ${key}` })
    : Effect.succeed(value);
};

const validateArgs = (
  id: string,
  args: unknown,
): Effect.Effect<void, CommandError> => {
  const invalid = () =>
    new CommandError({ message: `Invalid arguments: ${id}` });
  switch (id) {
    case "connect":
      return Schema.decodeUnknownEffect(ConnectArgs)(args).pipe(
        Effect.asVoid,
        Effect.mapError(invalid),
      );
    case "select-channel":
      return Schema.decodeUnknownEffect(ChannelArgs)(args).pipe(
        Effect.asVoid,
        Effect.mapError(invalid),
      );
    case "send-message":
      return Schema.decodeUnknownEffect(MessageArgs)(args).pipe(
        Effect.asVoid,
        Effect.mapError(invalid),
      );
    case "open-private-chat":
      return Schema.decodeUnknownEffect(PrivateChatArgs)(args).pipe(
        Effect.asVoid,
        Effect.mapError(invalid),
      );
    case "set-nickname":
      return Schema.decodeUnknownEffect(NicknameArgs)(args).pipe(
        Effect.asVoid,
        Effect.mapError(invalid),
      );
    default:
      return Schema.decodeUnknownEffect(NoArgs)(args).pipe(
        Effect.asVoid,
        Effect.mapError(invalid),
      );
  }
};

export interface CommandServiceShape {
  readonly dispatch: (
    invocation: CommandInvocation,
  ) => Effect.Effect<void, CommandError>;
  readonly execute: (
    invocation: CommandInvocation,
  ) => Effect.Effect<void, CommandError>;
  readonly registry: ReadonlyArray<CommandMetadata>;
}
export class CommandService extends Context.Service<
  CommandService,
  CommandServiceShape
>()("@tstui/CommandService") {}

export const CommandLive = Layer.effect(
  CommandService,
  Effect.gen(function* () {
    const teamspeak = yield* TeamSpeakPort;
    const projection = yield* ProjectionService;
    const bus = yield* EventBus;
    const queue = yield* Queue.make<CommandInvocation>({
      capacity: 32,
      strategy: "dropping",
    });
    const execute = Effect.fn("CommandService.execute")(function* (
      invocation: CommandInvocation,
    ) {
      const state = yield* projection.snapshot;
      const metadata = commandRegistry.find(
        (entry) => entry.id === invocation.id,
      );
      if (metadata === undefined)
        return yield* new CommandError({
          message: `Unknown command: ${invocation.id}`,
        });
      if (!metadata.enabled(state))
        return yield* new CommandError({
          message:
            invocation.id === "open-private-chat"
              ? "Command unavailable until M1-S3: open-private-chat"
              : `Command disabled: ${invocation.id}`,
        });
      yield* validateArgs(invocation.id, invocation.args);
      switch (invocation.id) {
        case "connect":
          return yield* teamspeak
            .connect({
              server: yield* required(invocation.args, "server"),
              nickname: yield* required(invocation.args, "nickname"),
            })
            .pipe(
              Effect.mapError(
                (error) => new CommandError({ message: error.message }),
              ),
            );
        case "disconnect":
          return yield* teamspeak.disconnect;
        case "join-channel":
          if (state.selectedChannelId === null)
            return yield* new CommandError({ message: "No channel selected" });
          yield* teamspeak.joinChannel(state.selectedChannelId);
          return yield* bus
            .publish({
              _tag: "ChannelJoined",
              channelId: state.selectedChannelId,
            })
            .pipe(Effect.asVoid);
        case "send-message":
          return yield* teamspeak.sendMessage(
            yield* required(invocation.args, "targetId"),
            yield* required(invocation.args, "body"),
          );
        case "set-nickname":
          return yield* teamspeak.setNickname(
            yield* required(invocation.args, "nickname"),
          );
        case "select-channel": {
          const channelId = yield* required(invocation.args, "channelId");
          if (!state.channels.some((channel) => channel.id === channelId))
            return yield* new CommandError({
              message: `Unknown channel: ${channelId}`,
            });
          return yield* bus
            .publish({
              _tag: "ChannelSelected",
              channelId,
            })
            .pipe(Effect.asVoid);
        }
        case "focus-next":
        case "focus-prev": {
          const focus = state.focus === "tree" ? "chat" : "tree";
          return yield* bus
            .publish({ _tag: "FocusChanged", focus })
            .pipe(Effect.asVoid);
        }
        case "tree-up":
        case "tree-down": {
          const current = selectedChannelIndex(state);
          const offset = invocation.id === "tree-up" ? -1 : 1;
          const next = Math.max(
            0,
            Math.min(state.channels.length - 1, current + offset),
          );
          const channel = state.channels[next];
          if (channel === undefined) return;
          return yield* bus
            .publish({ _tag: "ChannelSelected", channelId: channel.id })
            .pipe(Effect.asVoid);
        }
        case "open-private-chat":
          return yield* new CommandError({
            message: "Command unavailable until M1-S3: open-private-chat",
          });
        case "quit":
          return;
      }
    });
    yield* Stream.fromQueue(queue).pipe(
      Stream.runForEach((invocation) =>
        execute(invocation).pipe(
          Effect.catch((error) => Effect.logWarning(error.message)),
        ),
      ),
      Effect.forkScoped,
    );
    return CommandService.of({
      dispatch: Effect.fn("CommandService.dispatch")(function* (invocation) {
        const accepted = yield* Queue.offer(queue, invocation);
        if (!accepted)
          return yield* new CommandError({ message: "Command queue is full" });
      }),
      execute,
      registry: commandRegistry,
    });
  }),
);
