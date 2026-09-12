import { expect, test } from "bun:test";
import {
  Effect,
  ManagedRuntime,
  Option,
  Stream,
  SubscriptionRef,
} from "effect";
import {
  CommandService,
  ProjectionService,
  commandRegistry,
  initialState,
  makeAppLayer,
  type AppState,
} from "../src/index.js";

const waitForState = (
  runtime: ManagedRuntime.ManagedRuntime<never, never>,
  predicate: (state: AppState) => boolean,
): Promise<AppState> =>
  runtime.runPromise(
    ProjectionService.use((projection) =>
      SubscriptionRef.changes(projection.state).pipe(
        Stream.filter(predicate),
        Stream.runHead,
        Effect.map(Option.getOrThrow),
      ),
    ),
  );

const commandEnabled = (id: string, state: AppState): boolean =>
  commandRegistry.find((command) => command.id === id)?.enabled(state) ?? false;

test("command interpreter rejects unknown and disabled commands", async () => {
  const runtime = ManagedRuntime.make(makeAppLayer(true));
  try {
    const unknown = await runtime.runPromiseExit(
      CommandService.use((service) =>
        service.execute({ id: "missing", args: {} }),
      ),
    );
    const disabled = await runtime.runPromiseExit(
      CommandService.use((service) =>
        service.execute({
          id: "send-message",
          args: { targetId: "1", body: "x" },
        }),
      ),
    );
    expect(unknown._tag).toBe("Failure");
    expect(disabled._tag).toBe("Failure");
  } finally {
    await runtime.dispose();
  }
});

test("focus and tree commands enforce focus, bounds, and selected-channel join", async () => {
  const runtime = ManagedRuntime.make(makeAppLayer(true));
  try {
    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({
          id: "connect",
          args: { server: "demo", nickname: "Test" },
        }),
      ),
    );
    const connected = await waitForState(
      runtime,
      (state) => state.channels.length === 3,
    );
    expect(connected.focus).toBe("tree");
    expect(connected.selectedChannelId).toBe("1");

    const treeUp = commandRegistry.find((command) => command.id === "tree-up");
    const treeDown = commandRegistry.find(
      (command) => command.id === "tree-down",
    );
    expect(treeUp?.enabled(connected)).toBe(true);
    expect(treeDown?.enabled(connected)).toBe(true);

    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({ id: "tree-up", args: {} }),
      ),
    );
    expect(
      (await waitForState(runtime, (state) => state.selectedChannelId === "1"))
        .selectedChannelId,
    ).toBe("1");

    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({ id: "tree-down", args: {} }),
      ),
    );
    const selectedSecond = await waitForState(
      runtime,
      (state) => state.selectedChannelId === "2",
    );
    expect(selectedSecond.activeChannelId).toBeNull();

    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({ id: "join-channel", args: {} }),
      ),
    );
    expect(
      (await waitForState(runtime, (state) => state.activeChannelId === "2"))
        .activeChannelId,
    ).toBe("2");

    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({ id: "focus-next", args: {} }),
      ),
    );
    const chatFocused = await waitForState(
      runtime,
      (state) => state.focus === "chat",
    );
    expect(treeDown?.enabled(chatFocused)).toBe(false);
    const wrongFocus = await runtime.runPromiseExit(
      CommandService.use((service) =>
        service.execute({ id: "tree-down", args: {} }),
      ),
    );
    expect(wrongFocus._tag).toBe("Failure");

    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({ id: "focus-prev", args: {} }),
      ),
    );
    await waitForState(runtime, (state) => state.focus === "tree");
    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({ id: "tree-down", args: {} }),
      ),
    );
    const bottom = await waitForState(
      runtime,
      (state) => state.selectedChannelId === "3",
    );
    expect(treeDown?.enabled(bottom)).toBe(true);
    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({ id: "tree-down", args: {} }),
      ),
    );
    expect(
      (await waitForState(runtime, (state) => state.selectedChannelId === "3"))
        .selectedChannelId,
    ).toBe("3");
  } finally {
    await runtime.dispose();
  }
});

test("new command enablement rejects disconnected, empty, missing, and wrong-focus states", () => {
  const disconnected = initialState;
  const empty = {
    ...initialState,
    phase: "connected" as const,
    focus: "tree" as const,
  };
  const missing = {
    ...empty,
    channels: [{ id: "1", parentId: "0", name: "Lobby" }],
    selectedChannelId: "missing",
  };
  const chat = {
    ...missing,
    selectedChannelId: "1",
    focus: "chat" as const,
  };

  for (const id of ["focus-next", "focus-prev", "tree-up", "tree-down"])
    expect(commandEnabled(id, disconnected)).toBe(false);
  for (const id of ["tree-up", "tree-down", "join-channel"])
    expect(commandEnabled(id, empty)).toBe(false);
  for (const id of ["tree-up", "tree-down", "join-channel"])
    expect(commandEnabled(id, missing)).toBe(false);
  expect(commandEnabled("join-channel", chat)).toBe(false);
});

test("invalid channel and deferred private targets return typed errors without moving the cursor", async () => {
  const runtime = ManagedRuntime.make(makeAppLayer(true));
  try {
    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({
          id: "connect",
          args: { server: "demo", nickname: "Test" },
        }),
      ),
    );
    const connected = await waitForState(
      runtime,
      (state) => state.channels.length === 3,
    );

    const invalidChannel = await runtime.runPromise(
      CommandService.use((service) =>
        service
          .execute({ id: "select-channel", args: { channelId: "missing" } })
          .pipe(Effect.flip),
      ),
    );
    const privateTarget = await runtime.runPromise(
      CommandService.use((service) =>
        service
          .execute({ id: "open-private-chat", args: { targetId: "bot" } })
          .pipe(Effect.flip),
      ),
    );
    const after = await runtime.runPromise(
      ProjectionService.use((projection) => projection.snapshot),
    );

    expect(invalidChannel._tag).toBe("CommandError");
    expect(invalidChannel.message).toBe("Unknown channel: missing");
    expect(privateTarget._tag).toBe("CommandError");
    expect(privateTarget.message).toBe(
      "Command unavailable until M1-S3: open-private-chat",
    );
    expect(after.selectedChannelId).toBe(connected.selectedChannelId);
  } finally {
    await runtime.dispose();
  }
});

test("command metadata schemas reject missing arguments", async () => {
  const runtime = ManagedRuntime.make(makeAppLayer(true));
  try {
    const result = await runtime.runPromiseExit(
      CommandService.use((service) =>
        service.execute({
          id: "connect",
          args: { server: "demo" },
        }),
      ),
    );
    expect(result._tag).toBe("Failure");
  } finally {
    await runtime.dispose();
  }
});
