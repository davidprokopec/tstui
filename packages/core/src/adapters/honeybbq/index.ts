import {
  Client,
  clientMove,
  generateIdentity,
  identityFromString,
  listChannels,
  listClients,
  sendTextMessage,
  type ClientMovedEvent,
  type Identity,
  type TextMessage,
} from "@honeybbq/teamspeak-client";
import { Effect, Exit, Layer, Queue, Scope, Stream } from "effect";
import { CommandError, ConnectionError } from "../../domain/errors.js";
import type { Channel, ClientEntry } from "../../domain/model.js";
import type { DomainEvent } from "../../events.js";
import { PersistencePort } from "../../ports/persistence.js";
import { TeamSpeakPort, type ConnectOptions } from "../../ports/teamspeak.js";
import { EventBus } from "../../state.js";
import {
  normalizeChannel,
  normalizeClient,
  normalizeMessage,
} from "./normalize.js";

export interface HoneyBBQClientHandle {
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
  readonly listChannels: () => Promise<ReadonlyArray<Channel>>;
  readonly listClients: () => Promise<ReadonlyArray<ClientEntry>>;
  readonly joinChannel: (channelId: string) => Promise<void>;
  readonly sendMessage: (targetId: string, body: string) => Promise<void>;
  readonly setNickname: (nickname: string) => Promise<void>;
  readonly onTextMessage: (listener: (message: TextMessage) => void) => void;
  readonly onClientMoved: (listener: (event: ClientMovedEvent) => void) => void;
  readonly onDisconnected: (
    listener: (error: Error | undefined) => void,
  ) => void;
}

export interface HoneyBBQClientFactory {
  readonly create: (
    identity: Identity,
    options: ConnectOptions,
  ) => HoneyBBQClientHandle;
}

const escapeValue = (value: string): string => value.replaceAll(" ", "\\s");

export const honeyBBQClientFactory: HoneyBBQClientFactory = {
  create: (identity, options) => {
    const client = new Client(identity, options.server, options.nickname);
    return {
      connect: () => client.connect(),
      disconnect: () => client.disconnect(),
      listChannels: async () =>
        (await listChannels(client)).map(normalizeChannel),
      listClients: async () => (await listClients(client)).map(normalizeClient),
      joinChannel: (channelId) =>
        clientMove(client, client.clientID(), BigInt(channelId)),
      sendMessage: (targetId, body) =>
        sendTextMessage(client, 2, BigInt(targetId), body),
      setNickname: (nickname) =>
        client.execCommand(
          `clientupdate client_nickname=${escapeValue(nickname)}`,
        ),
      onTextMessage: (listener) => {
        client.on("textMessage", listener);
      },
      onClientMoved: (listener) => {
        client.on("clientMoved", listener);
      },
      onDisconnected: (listener) => {
        client.on("disconnected", listener);
      },
    };
  },
};

const connectionFailure = (cause: unknown): ConnectionError =>
  new ConnectionError({ message: String(cause), transient: true });
const commandFailure = (cause: unknown): CommandError =>
  new CommandError({ message: String(cause) });

interface OwnedClient {
  readonly client: HoneyBBQClientHandle;
  readonly scope: Scope.Closeable;
  readonly generation: number;
  acceptingCallbacks: boolean;
  overflowed: boolean;
  released: boolean;
}

interface ConnectionAttempt {
  readonly generation: number;
  owner: OwnedClient | null;
  cancelled: boolean;
}

interface CallbackEvent {
  readonly owner: OwnedClient;
  readonly event: DomainEvent;
}

interface TerminalEvent {
  readonly owner: OwnedClient;
  readonly error: Error | undefined;
}

export const makeHoneyBBQTeamSpeakLayer = (factory: HoneyBBQClientFactory) =>
  Layer.effect(
    TeamSpeakPort,
    Effect.gen(function* () {
      const bus = yield* EventBus;
      const persistence = yield* PersistencePort;
      const callbacks = yield* Queue.make<CallbackEvent>({
        capacity: 32,
        strategy: "dropping",
      });
      const terminals = yield* Queue.make<TerminalEvent>({
        capacity: 1,
        strategy: "dropping",
      });
      let active: OwnedClient | null = null;
      let currentAttempt: ConnectionAttempt | null = null;
      let latestGeneration = 0;

      const cancelledAttempt = (): ConnectionError =>
        new ConnectionError({
          message: "Connection attempt was cancelled",
          transient: false,
        });

      const ensureCurrent = (
        attempt: ConnectionAttempt,
      ): Effect.Effect<void, ConnectionError> =>
        currentAttempt === attempt && !attempt.cancelled
          ? Effect.void
          : cancelledAttempt();

      const ensureOwnerCurrent = (
        attempt: ConnectionAttempt,
        owner: OwnedClient,
      ): Effect.Effect<void, ConnectionError> =>
        currentAttempt === attempt &&
        attempt.owner === owner &&
        active === owner &&
        !attempt.cancelled &&
        !owner.released
          ? Effect.void
          : cancelledAttempt();

      const release = Effect.fn("HoneyBBQ.release")(function* (
        owner: OwnedClient,
      ) {
        if (owner.released) return;
        owner.released = true;
        owner.acceptingCallbacks = false;
        if (active === owner) active = null;
        yield* Scope.close(owner.scope, Exit.succeed(undefined));
      });

      const enqueue = (owner: OwnedClient, event: DomainEvent): void => {
        if (!owner.acceptingCallbacks) return;
        if (!Queue.offerUnsafe(callbacks, { owner, event }))
          owner.overflowed = true;
      };

      const callbackWorker = Stream.fromQueue(callbacks).pipe(
        Stream.runForEach(({ owner, event }) =>
          owner.acceptingCallbacks
            ? Effect.gen(function* () {
                yield* bus.publish(event);
                if (owner.overflowed) {
                  owner.overflowed = false;
                  yield* bus.publish({
                    _tag: "ErrorRaised",
                    message:
                      "TeamSpeak callback queue overflowed; events were dropped",
                  });
                }
              })
            : Effect.void,
        ),
      );
      const terminalWorker = Stream.fromQueue(terminals).pipe(
        Stream.runForEach(({ owner, error }) =>
          Effect.gen(function* () {
            yield* release(owner);
            if (
              latestGeneration === owner.generation &&
              currentAttempt === null
            ) {
              yield* bus.publish({
                _tag: "ConnectionChanged",
                phase: "disconnected",
                server: null,
              });
              if (error !== undefined)
                yield* bus.publish({
                  _tag: "ErrorRaised",
                  message: error.message,
                });
            }
          }),
        ),
      );
      yield* Effect.all([callbackWorker, terminalWorker], {
        concurrency: "unbounded",
      }).pipe(Effect.forkScoped);

      yield* Effect.addFinalizer(() => {
        const owner = active;
        return owner === null ? Effect.void : release(owner);
      });

      const withClient = <A>(
        run: (client: HoneyBBQClientHandle) => Promise<A>,
      ): Effect.Effect<A, CommandError> => {
        const owner = active;
        return owner === null || owner.released
          ? new CommandError({ message: "Not connected" })
          : Effect.tryPromise({
              try: () => run(owner.client),
              catch: commandFailure,
            });
      };

      return TeamSpeakPort.of({
        connect: Effect.fn("HoneyBBQ.connect")(function* (options) {
          if (currentAttempt !== null)
            return yield* new ConnectionError({
              message: "Already connected",
              transient: false,
            });
          latestGeneration += 1;
          const attempt: ConnectionAttempt = {
            generation: latestGeneration,
            owner: null,
            cancelled: false,
          };
          currentAttempt = attempt;

          yield* Effect.gen(function* () {
            yield* bus.publish({
              _tag: "ConnectionChanged",
              phase: "connecting",
              server: null,
            });
            yield* ensureCurrent(attempt);
            const saved = yield* persistence.loadIdentity.pipe(
              Effect.mapError((error) => connectionFailure(error.message)),
            );
            yield* ensureCurrent(attempt);
            const identity = yield* Effect.try({
              try: () =>
                saved === null
                  ? generateIdentity(8)
                  : identityFromString(saved),
              catch: connectionFailure,
            });
            yield* ensureCurrent(attempt);
            if (saved === null) {
              yield* persistence
                .saveIdentity(identity.toString())
                .pipe(
                  Effect.mapError((error) => connectionFailure(error.message)),
                );
              yield* ensureCurrent(attempt);
            }

            const owner = yield* Effect.uninterruptible(
              Effect.gen(function* () {
                const scope = yield* Scope.make();
                return yield* Effect.gen(function* () {
                  const client = yield* Effect.try({
                    try: () => factory.create(identity, options),
                    catch: connectionFailure,
                  });
                  const acquired: OwnedClient = {
                    client,
                    scope,
                    generation: attempt.generation,
                    acceptingCallbacks: true,
                    overflowed: false,
                    released: false,
                  };
                  yield* Scope.addFinalizer(
                    scope,
                    Effect.tryPromise({
                      try: client.disconnect,
                      catch: commandFailure,
                    }).pipe(Effect.catch(() => Effect.void)),
                  );
                  attempt.owner = acquired;
                  return acquired;
                }).pipe(
                  Effect.onError(() =>
                    Scope.close(scope, Exit.succeed(undefined)),
                  ),
                );
              }),
            );
            yield* ensureCurrent(attempt);
            active = owner;
            const client = owner.client;

            const onTextMessage = (message: TextMessage): void => {
              try {
                enqueue(owner, {
                  _tag: "MessageReceived",
                  message: normalizeMessage(
                    message,
                    crypto.randomUUID(),
                    Date.now(),
                  ),
                });
              } catch (cause) {
                enqueue(owner, {
                  _tag: "ErrorRaised",
                  message: String(cause),
                });
              }
            };
            const onClientMoved = (event: ClientMovedEvent): void => {
              try {
                enqueue(owner, {
                  _tag: "ClientMoved",
                  clientId: String(event.id),
                  channelId: event.targetChannelID.toString(),
                });
              } catch (cause) {
                enqueue(owner, {
                  _tag: "ErrorRaised",
                  message: String(cause),
                });
              }
            };
            const onDisconnected = (error: Error | undefined): void => {
              if (!owner.acceptingCallbacks) return;
              attempt.cancelled = true;
              if (currentAttempt === attempt) currentAttempt = null;
              owner.acceptingCallbacks = false;
              Queue.offerUnsafe(terminals, { owner, error });
            };
            client.onTextMessage(onTextMessage);
            client.onClientMoved(onClientMoved);
            client.onDisconnected(onDisconnected);

            yield* Effect.tryPromise({
              try: client.connect,
              catch: connectionFailure,
            });
            yield* ensureOwnerCurrent(attempt, owner);
            const [channels, clients] = yield* Effect.tryPromise({
              try: () =>
                Promise.all([client.listChannels(), client.listClients()]),
              catch: connectionFailure,
            });
            yield* ensureOwnerCurrent(attempt, owner);
            yield* bus.publish({
              _tag: "ConnectionChanged",
              phase: "connected",
              server: { id: options.server, name: options.server },
            });
            yield* ensureOwnerCurrent(attempt, owner);
            yield* bus.publish({
              _tag: "ChannelListUpdated",
              channels: [...channels],
            });
            yield* ensureOwnerCurrent(attempt, owner);
            yield* bus.publish({
              _tag: "ClientListUpdated",
              clients: [...clients],
            });
            yield* ensureOwnerCurrent(attempt, owner);
            yield* bus.publish({
              _tag: "CapabilityChanged",
              capabilities: {
                text: "available",
                voice: "unavailable",
                files: "unavailable",
                transport: "honeybbq",
              },
            });
            yield* ensureOwnerCurrent(attempt, owner);
          }).pipe(
            Effect.onExit((exit) =>
              Exit.isFailure(exit)
                ? Effect.gen(function* () {
                    const owner = attempt.owner;
                    if (owner !== null) yield* release(owner);
                    if (currentAttempt === attempt) {
                      attempt.cancelled = true;
                      currentAttempt = null;
                      if (latestGeneration === attempt.generation)
                        yield* bus.publish({
                          _tag: "ConnectionChanged",
                          phase: "disconnected",
                          server: null,
                        });
                    }
                  })
                : Effect.void,
            ),
          );
        }),
        disconnect: Effect.gen(function* () {
          const attempt = currentAttempt;
          const generation = attempt?.generation ?? latestGeneration;
          if (attempt !== null) {
            attempt.cancelled = true;
            currentAttempt = null;
          }
          const owner = attempt?.owner ?? active;
          if (owner !== null) yield* release(owner);
          if (latestGeneration === generation && currentAttempt === null)
            yield* bus.publish({
              _tag: "ConnectionChanged",
              phase: "disconnected",
              server: null,
            });
        }),
        joinChannel: (channelId) =>
          withClient((client) => client.joinChannel(channelId)),
        sendMessage: (targetId, body) =>
          withClient((client) => client.sendMessage(targetId, body)),
        setNickname: (nickname) =>
          withClient((client) => client.setNickname(nickname)).pipe(
            Effect.tap(() =>
              bus.publish({ _tag: "NicknameChanged", nickname }),
            ),
          ),
      });
    }),
  );

export const HoneyBBQTeamSpeakLive = makeHoneyBBQTeamSpeakLayer(
  honeyBBQClientFactory,
);
