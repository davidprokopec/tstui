import { expect, test } from "bun:test";
import type { ClientMovedEvent, TextMessage } from "@honeybbq/teamspeak-client";
import {
  Effect,
  Fiber,
  Layer,
  ManagedRuntime,
  Option,
  Stream,
  SubscriptionRef,
} from "effect";
import {
  EventBusLive,
  makeHoneyBBQTeamSpeakLayer,
  PersistenceMemory,
  ProjectionLive,
  ProjectionService,
  TeamSpeakPort,
  type HoneyBBQClientHandle,
} from "../src/index.js";

class MockClient implements HoneyBBQClientHandle {
  readonly textListeners: Array<(message: TextMessage) => void> = [];
  readonly moveListeners: Array<(event: ClientMovedEvent) => void> = [];
  readonly disconnectListeners: Array<(error: Error | undefined) => void> = [];
  disconnectCalls = 0;

  constructor(
    readonly connect: () => Promise<void>,
    readonly disconnectResult: () => Promise<void> = () => Promise.resolve(),
  ) {}

  readonly disconnect = async (): Promise<void> => {
    this.disconnectCalls += 1;
    await this.disconnectResult();
  };
  readonly listChannels = async () => [
    { id: "1", parentId: "0", name: "Lobby" },
  ];
  readonly listClients = async () => [
    { id: "self", channelId: "1", nickname: "Test" },
  ];
  readonly joinChannel = async (): Promise<void> => undefined;
  readonly sendMessage = async (): Promise<void> => undefined;
  readonly setNickname = async (): Promise<void> => undefined;
  readonly onTextMessage = (listener: (message: TextMessage) => void): void => {
    this.textListeners.push(listener);
  };
  readonly onClientMoved = (
    listener: (event: ClientMovedEvent) => void,
  ): void => {
    this.moveListeners.push(listener);
  };
  readonly onDisconnected = (
    listener: (error: Error | undefined) => void,
  ): void => {
    this.disconnectListeners.push(listener);
  };

  emitMessage(index: number): void {
    const message: TextMessage = {
      invokerName: "Mock",
      invokerUID: "mock",
      message: `message-${index}`,
      invokerGroups: [],
      targetMode: 2,
      targetID: 1n,
      invokerID: 2,
    };
    for (const listener of this.textListeners) listener(message);
  }

  emitDisconnect(error: Error | undefined): void {
    for (const listener of this.disconnectListeners) listener(error);
  }
}

const makeRuntime = (client: MockClient) => {
  const infrastructure = Layer.merge(EventBusLive, PersistenceMemory);
  const services = Layer.merge(
    ProjectionLive,
    makeHoneyBBQTeamSpeakLayer({ create: () => client }),
  ).pipe(Layer.provideMerge(infrastructure));
  return ManagedRuntime.make(services);
};

const connect = TeamSpeakPort.use((teamspeak) =>
  teamspeak.connect({ server: "mock", nickname: "Test" }),
);

test("failed connection releases the client and projects disconnected", async () => {
  const client = new MockClient(() =>
    Promise.reject(new Error("connect failed")),
  );
  const runtime = makeRuntime(client);
  try {
    expect((await runtime.runPromiseExit(connect))._tag).toBe("Failure");
    const state = await runtime.runPromise(
      Effect.yieldNow.pipe(
        Effect.andThen(
          ProjectionService.use((projection) => projection.snapshot),
        ),
      ),
    );
    expect(state.phase).toBe("disconnected");
    expect(client.disconnectCalls).toBe(1);
  } finally {
    await runtime.dispose();
  }
});

test("interrupted connection releases the allocated client", async () => {
  let started: (() => void) | undefined;
  const connecting = new Promise<void>((resolve) => {
    started = resolve;
  });
  const client = new MockClient(() => {
    started?.();
    return new Promise<void>(() => undefined);
  });
  const runtime = makeRuntime(client);
  const fiber = runtime.runFork(connect);
  await connecting;
  await runtime.runPromise(Fiber.interrupt(fiber));
  expect(client.disconnectCalls).toBe(1);
  await runtime.dispose();
});

test("errorful remote disconnect clears connected projection and releases", async () => {
  const client = new MockClient(() => Promise.resolve());
  const runtime = makeRuntime(client);
  try {
    await runtime.runPromise(connect);
    client.emitDisconnect(new Error("remote closed"));
    const state = await runtime.runPromise(
      ProjectionService.use((projection) =>
        SubscriptionRef.changes(projection.state).pipe(
          Stream.filter(
            (snapshot) =>
              snapshot.phase === "disconnected" &&
              snapshot.error === "remote closed",
          ),
          Stream.runHead,
          Effect.map(Option.getOrThrow),
        ),
      ),
    );
    expect(state.phase).toBe("disconnected");
    expect(client.disconnectCalls).toBe(1);
  } finally {
    await runtime.dispose();
  }
});

test("bounded callback ingress reports overflow and disposal disconnects once", async () => {
  const client = new MockClient(() => Promise.resolve());
  const runtime = makeRuntime(client);
  try {
    await runtime.runPromise(connect);
    for (let index = 0; index < 100; index += 1) client.emitMessage(index);
    const state = await runtime.runPromise(
      ProjectionService.use((projection) =>
        SubscriptionRef.changes(projection.state).pipe(
          Stream.filter(
            (snapshot) => snapshot.error?.includes("overflowed") === true,
          ),
          Stream.runHead,
          Effect.map(Option.getOrThrow),
        ),
      ),
    );
    expect(state.error).toContain("overflowed");
  } finally {
    await runtime.dispose();
  }
  expect(client.disconnectCalls).toBe(1);
});

test("disconnect promise rejection is contained by scoped cleanup", async () => {
  const client = new MockClient(
    () => Promise.resolve(),
    () => Promise.reject(new Error("disconnect failed")),
  );
  const runtime = makeRuntime(client);
  await runtime.runPromise(connect);
  await runtime.dispose();
  expect(client.disconnectCalls).toBe(1);
});
