import { expect, test } from "bun:test";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { testRender } from "@opentui/solid";
import { installKeymaps } from "@tstui/tui";
import {
  CommandService,
  ProjectionService,
  initialState,
  makeAppLayer,
  type AppState,
} from "@tstui/core";
import {
  Effect,
  ManagedRuntime,
  Option,
  Stream,
  SubscriptionRef,
} from "effect";

test("default OpenTUI keymap dispatches q to quit", async () => {
  const setup = await testRender(() => null, { width: 40, height: 10 });
  let quit = false;
  let command = "";
  const dispose = installKeymaps(
    createDefaultOpenTuiKeymap(setup.renderer),
    (invocation) => {
      command = invocation.id;
    },
    () => initialState,
    () => {
      quit = true;
    },
  );
  try {
    await setup.mockInput.pressKey("q");
    expect(quit).toBe(true);
    expect(command).toBe("quit");
  } finally {
    dispose();
    setup.renderer.destroy();
  }
});

test("default OpenTUI keymap dispatches focus and focus-gated tree commands", async () => {
  const setup = await testRender(() => null, { width: 40, height: 10 });
  const commands: Array<string> = [];
  let focus: "tree" | "chat" = "tree";
  const dispose = installKeymaps(
    createDefaultOpenTuiKeymap(setup.renderer),
    (invocation) => commands.push(invocation.id),
    () => ({ ...initialState, phase: "connected", focus }),
    () => undefined,
  );
  try {
    await setup.mockInput.pressKey("j");
    setup.mockInput.pressArrow("down");
    setup.mockInput.pressEnter();
    setup.mockInput.pressTab();
    focus = "chat";
    await setup.mockInput.pressKey("k");
    expect(commands).toEqual([
      "tree-down",
      "tree-down",
      "join-channel",
      "focus-next",
    ]);
  } finally {
    dispose();
    setup.renderer.destroy();
  }
});

test("key input navigates and joins through the app command runtime", async () => {
  const runtime = ManagedRuntime.make(makeAppLayer(true));
  const setup = await testRender(() => null, { width: 40, height: 10 });
  let currentState: AppState = initialState;
  const waitFor = (
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
  const dispose = installKeymaps(
    createDefaultOpenTuiKeymap(setup.renderer),
    (invocation) => {
      runtime.runFork(
        CommandService.use((service) => service.execute(invocation)),
      );
    },
    () => currentState,
    () => undefined,
  );
  try {
    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({
          id: "connect",
          args: { server: "demo", nickname: "Test" },
        }),
      ),
    );
    currentState = await waitFor((state) => state.channels.length === 3);

    await setup.mockInput.pressKey("j");
    currentState = await waitFor((state) => state.selectedChannelId === "2");
    setup.mockInput.pressEnter();
    currentState = await waitFor((state) => state.activeChannelId === "2");

    expect(currentState.selectedChannelId).toBe("2");
    expect(currentState.activeChannelId).toBe("2");
    expect(
      currentState.clients.find((client) => client.id === "self")?.channelId,
    ).toBe("2");
  } finally {
    dispose();
    setup.renderer.destroy();
    await runtime.dispose();
  }
});
