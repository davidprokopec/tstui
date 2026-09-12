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

export const commandRegistry: ReadonlyArray<CommandMetadata> = [
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
    args: ChannelArgs,
    enabled: (s) => s.phase === "connected",
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
    description: "Select a private target (planned UI)",
    args: PrivateChatArgs,
    enabled: (s) => s.phase === "connected",
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
    case "join-channel":
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
          message: `Command disabled: ${invocation.id}`,
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
          return yield* teamspeak.joinChannel(
            yield* required(invocation.args, "channelId"),
          );
        case "send-message":
          return yield* teamspeak.sendMessage(
            yield* required(invocation.args, "targetId"),
            yield* required(invocation.args, "body"),
          );
        case "set-nickname":
          return yield* teamspeak.setNickname(
            yield* required(invocation.args, "nickname"),
          );
        case "select-channel":
          return yield* bus
            .publish({
              _tag: "ChannelSelected",
              channelId: yield* required(invocation.args, "channelId"),
            })
            .pipe(Effect.asVoid);
        case "open-private-chat":
          return yield* bus
            .publish({
              _tag: "ChannelSelected",
              channelId: yield* required(invocation.args, "targetId"),
            })
            .pipe(Effect.asVoid);
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
