import { Effect, Layer } from "effect";
import { CommandError, ConnectionError } from "../../domain/errors.js";
import { EventBus } from "../../state.js";
import { TeamSpeakPort } from "../../ports/teamspeak.js";

export const FakeTeamSpeakLive = Layer.effect(
  TeamSpeakPort,
  Effect.gen(function* () {
    const bus = yield* EventBus;
    let connected = false;
    let nickname = "tstui-user";
    const requireConnection = <A>(
      effect: Effect.Effect<A>,
    ): Effect.Effect<A, CommandError> =>
      connected ? effect : new CommandError({ message: "Not connected" });

    return TeamSpeakPort.of({
      connect: Effect.fn("FakeTeamSpeak.connect")(function* (options) {
        if (options.server.trim() === "")
          return yield* new ConnectionError({
            message: "Server is required",
            transient: false,
          });
        nickname = options.nickname;
        yield* bus.publish({
          _tag: "ConnectionChanged",
          phase: "connecting",
          server: null,
        });
        connected = true;
        yield* bus.publish({
          _tag: "ConnectionChanged",
          phase: "connected",
          server: { id: "demo", name: "tstui demo" },
        });
        yield* bus.publish({
          _tag: "ChannelListUpdated",
          channels: [
            { id: "1", parentId: "0", name: "Lobby" },
            { id: "2", parentId: "0", name: "Development" },
            { id: "3", parentId: "2", name: "Effect" },
          ],
        });
        yield* bus.publish({
          _tag: "ClientListUpdated",
          clients: [
            { id: "self", channelId: "1", nickname },
            { id: "bot", channelId: "2", nickname: "Demo Bot" },
          ],
        });
        yield* bus.publish({
          _tag: "CapabilityChanged",
          capabilities: {
            text: "available",
            voice: "unavailable",
            files: "unavailable",
            transport: "fake",
          },
        });
        yield* bus.publish({ _tag: "ChannelSelected", channelId: "1" });
        yield* bus.publish({
          _tag: "MessageReceived",
          message: {
            id: "welcome",
            targetId: "1",
            sender: "Demo Bot",
            body: "Welcome to the offline demo.",
            timestamp: 0,
          },
        });
      }),
      disconnect: Effect.gen(function* () {
        connected = false;
        yield* bus.publish({
          _tag: "ConnectionChanged",
          phase: "disconnected",
          server: null,
        });
      }),
      joinChannel: (channelId) =>
        requireConnection(
          Effect.gen(function* () {
            yield* bus.publish({
              _tag: "ClientMoved",
              clientId: "self",
              channelId,
            });
            yield* bus.publish({ _tag: "ChannelSelected", channelId });
          }),
        ),
      sendMessage: (targetId, body) =>
        requireConnection(
          bus
            .publish({
              _tag: "MessageReceived",
              message: {
                id: `demo-${targetId}-${body}`,
                targetId,
                sender: nickname,
                body,
                timestamp: 1,
              },
            })
            .pipe(Effect.asVoid),
        ),
      setNickname: (next) =>
        requireConnection(
          Effect.gen(function* () {
            nickname = next;
            yield* bus.publish({ _tag: "NicknameChanged", nickname: next });
          }),
        ),
    });
  }),
);
