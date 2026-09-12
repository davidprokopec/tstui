import { expect, test } from "bun:test";
import { initialState } from "@tstui/core";
import { testRender } from "@opentui/solid";
import { createComponent, createSignal } from "solid-js";
import { TstuiApp } from "../src/index.js";

test("renders server tree, chat and honest capabilities", async () => {
  const state = {
    ...initialState,
    phase: "connected" as const,
    server: { id: "demo", name: "Demo Server" },
    channels: [{ id: "1", parentId: "0", name: "Lobby" }],
    activeChannelId: "1",
    selectedChannelId: "1",
    focus: "tree" as const,
    messages: {
      "1": [
        { id: "m", targetId: "1", sender: "Ada", body: "hello", timestamp: 0 },
      ],
    },
  };
  const setup = await testRender(
    () => <TstuiApp state={state} dispatch={() => undefined} />,
    { width: 90, height: 20 },
  );
  await setup.renderOnce();
  const frame = setup.captureCharFrame();
  setup.renderer.destroy();
  expect(frame).toContain("Demo Server");
  expect(frame).toContain("Ada: hello");
  expect(frame).toContain("voice unavailable");
  expect(frame).toContain(">* # Lobby");
});

test("reacts to projected channel and message updates", async () => {
  const [state, setState] = createSignal({
    ...initialState,
    phase: "connected" as const,
    activeChannelId: "1",
    selectedChannelId: "1",
    focus: "tree" as const,
  });
  const setup = await testRender(
    () =>
      createComponent(TstuiApp, {
        get state() {
          return state();
        },
        dispatch: () => undefined,
      }),
    { width: 80, height: 24 },
  );
  try {
    await setup.renderOnce();
    expect(setup.captureCharFrame()).toContain("Chat · #1");
    setState({
      ...state(),
      activeChannelId: "2",
      selectedChannelId: "2",
      messages: {
        "2": [
          {
            id: "new",
            targetId: "2",
            sender: "Ada",
            body: "reactive update",
            timestamp: 1,
          },
        ],
      },
    });
    await setup.renderOnce();
    const frame = setup.captureCharFrame();
    expect(frame).toContain("Chat · #2");
    expect(frame).toContain("Ada: reactive update");
    expect(frame).not.toContain("Chat · #1");
    expect(frame).toContain("focus tree");
  } finally {
    setup.renderer.destroy();
  }
});
