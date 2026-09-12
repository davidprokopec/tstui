import {
  Context,
  Effect,
  Layer,
  PubSub,
  Stream,
  SubscriptionRef,
} from "effect";
import type { DomainEvent } from "./events.js";
import { initialState, type AppState } from "./domain/model.js";

export const reduceEvent = (state: AppState, event: DomainEvent): AppState => {
  switch (event._tag) {
    case "ConnectionChanged":
      return {
        ...state,
        phase: event.phase,
        server: event.server,
        error: null,
        focus:
          event.phase === "connected"
            ? "tree"
            : event.phase === "disconnected"
              ? "connect"
              : state.focus,
      };
    case "ChannelListUpdated":
      return {
        ...state,
        channels: event.channels,
        selectedChannelId: event.channels.some(
          (channel) => channel.id === state.selectedChannelId,
        )
          ? state.selectedChannelId
          : (event.channels[0]?.id ?? null),
      };
    case "ClientListUpdated":
      return { ...state, clients: event.clients };
    case "ClientMoved":
      return {
        ...state,
        clients: state.clients.map((client) =>
          client.id === event.clientId
            ? { ...client, channelId: event.channelId }
            : client,
        ),
      };
    case "MessageReceived":
      return {
        ...state,
        messages: {
          ...state.messages,
          [event.message.targetId]: [
            ...(state.messages[event.message.targetId] ?? []),
            event.message,
          ],
        },
      };
    case "ChannelSelected":
      return { ...state, selectedChannelId: event.channelId };
    case "ChannelJoined":
      return { ...state, activeChannelId: event.channelId };
    case "FocusChanged":
      return { ...state, focus: event.focus };
    case "NicknameChanged":
      return { ...state, nickname: event.nickname };
    case "CapabilityChanged":
      return { ...state, capabilities: event.capabilities };
    case "ErrorRaised":
      return { ...state, error: event.message };
  }
};

export interface EventBusShape {
  readonly events: PubSub.PubSub<DomainEvent>;
  readonly publish: (event: DomainEvent) => Effect.Effect<boolean>;
}
export class EventBus extends Context.Service<EventBus, EventBusShape>()(
  "@tstui/EventBus",
) {}

export const EventBusLive = Layer.effect(
  EventBus,
  Effect.gen(function* () {
    const events = yield* PubSub.bounded<DomainEvent>(64);
    return EventBus.of({
      events,
      publish: Effect.fn("EventBus.publish")((event: DomainEvent) =>
        PubSub.publish(events, event),
      ),
    });
  }),
);

export interface ProjectionShape {
  readonly state: SubscriptionRef.SubscriptionRef<AppState>;
  readonly snapshot: Effect.Effect<AppState>;
}
export class ProjectionService extends Context.Service<
  ProjectionService,
  ProjectionShape
>()("@tstui/ProjectionService") {}

export const ProjectionLive = Layer.effect(
  ProjectionService,
  Effect.gen(function* () {
    const bus = yield* EventBus;
    const state = yield* SubscriptionRef.make(initialState);
    yield* Stream.fromPubSub(bus.events).pipe(
      Stream.runForEach((event) =>
        SubscriptionRef.update(state, (current) => reduceEvent(current, event)),
      ),
      Effect.forkScoped,
    );
    yield* Effect.yieldNow;
    return ProjectionService.of({
      state,
      snapshot: SubscriptionRef.get(state),
    });
  }),
);
