import {
  Client,
  clientMove,
  generateIdentity,
  identityFromString,
  listChannels,
  listClients,
  sendTextMessage,
} from "@honeybbq/teamspeak-client";
import { Effect, Layer } from "effect";
import { CommandError, ConnectionError } from "../../domain/errors.js";
import { PersistencePort } from "../../ports/persistence.js";
import { TeamSpeakPort } from "../../ports/teamspeak.js";
import { EventBus } from "../../state.js";
import {
  normalizeChannel,
  normalizeClient,
  normalizeMessage,
} from "./normalize.js";

const connectionFailure = (cause: unknown): ConnectionError =>
  new ConnectionError({ message: String(cause), transient: true });
const commandFailure = (cause: unknown): CommandError =>
  new CommandError({ message: String(cause) });

export const HoneyBBQTeamSpeakLive = Layer.effect(
  TeamSpeakPort,
  Effect.gen(function* () {
    const bus = yield* EventBus;
    const persistence = yield* PersistencePort;
    let client: Client | null = null;
    let nickname = "tstui-user";

    const withClient = <A>(
      run: (active: Client) => Promise<A>,
    ): Effect.Effect<A, CommandError> => {
      const active = client;
      return active === null
        ? new CommandError({ message: "Not connected" })
        : Effect.tryPromise({ try: () => run(active), catch: commandFailure });
    };
    yield* Effect.addFinalizer(() => {
      const active = client;
      return active === null
        ? Effect.void
        : Effect.promise(() => active.disconnect()).pipe(
            Effect.catch(() => Effect.void),
          );
    });

    return TeamSpeakPort.of({
      connect: Effect.fn("HoneyBBQ.connect")(function* (options) {
        nickname = options.nickname;
        yield* bus.publish({
          _tag: "ConnectionChanged",
          phase: "connecting",
          server: null,
        });
        const saved = yield* persistence.loadIdentity.pipe(
          Effect.mapError((error) => connectionFailure(error.message)),
        );
        const identity =
          saved === null ? generateIdentity(8) : identityFromString(saved);
        if (saved === null)
          yield* persistence
            .saveIdentity(identity.toString())
            .pipe(Effect.mapError((error) => connectionFailure(error.message)));
        const active = new Client(identity, options.server, nickname);
        active.on("textMessage", (message) => {
          Effect.runFork(
            bus.publish({
              _tag: "MessageReceived",
              message: normalizeMessage(
                message,
                crypto.randomUUID(),
                Date.now(),
              ),
            }),
          );
        });
        active.on("clientMoved", (event) => {
          Effect.runFork(
            bus.publish({
              _tag: "ClientMoved",
              clientId: String(event.id),
              channelId: event.targetChannelID.toString(),
            }),
          );
        });
        active.on("disconnected", (error) => {
          Effect.runFork(
            bus.publish(
              error === undefined
                ? {
                    _tag: "ConnectionChanged",
                    phase: "disconnected",
                    server: null,
                  }
                : { _tag: "ErrorRaised", message: error.message },
            ),
          );
        });
        yield* Effect.tryPromise({
          try: () => active.connect(),
          catch: connectionFailure,
        });
        client = active;
        const [channels, clients] = yield* Effect.tryPromise({
          try: () => Promise.all([listChannels(active), listClients(active)]),
          catch: connectionFailure,
        });
        yield* bus.publish({
          _tag: "ConnectionChanged",
          phase: "connected",
          server: { id: options.server, name: options.server },
        });
        yield* bus.publish({
          _tag: "ChannelListUpdated",
          channels: channels.map(normalizeChannel),
        });
        yield* bus.publish({
          _tag: "ClientListUpdated",
          clients: clients.map(normalizeClient),
        });
        yield* bus.publish({
          _tag: "CapabilityChanged",
          capabilities: {
            text: "available",
            voice: "unavailable",
            files: "unavailable",
            transport: "honeybbq",
          },
        });
      }),
      disconnect: Effect.suspend(() => {
        const active = client;
        return active === null
          ? Effect.void
          : Effect.promise(() => active.disconnect()).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  client = null;
                }),
              ),
            );
      }),
      joinChannel: (channelId) =>
        withClient((active) =>
          clientMove(active, active.clientID(), BigInt(channelId)),
        ),
      sendMessage: (targetId, body) =>
        withClient((active) =>
          sendTextMessage(active, 2, BigInt(targetId), body),
        ),
      setNickname: (next) =>
        withClient(async (active) => {
          await active.execCommand(
            `clientupdate client_nickname=${next.replaceAll(" ", "\\s")}`,
          );
          nickname = next;
        }).pipe(
          Effect.tap(() =>
            bus.publish({ _tag: "NicknameChanged", nickname: next }),
          ),
        ),
    });
  }),
);
