import { expect, test } from "bun:test";
import { initialState } from "@tstui/core";
import { testRender } from "@opentui/solid";
import { TstuiApp } from "../src/index.js";

test("renders server tree, chat and honest capabilities", async () => {
  const state = {
    ...initialState,
    phase: "connected" as const,
    server: { id: "demo", name: "Demo Server" },
    channels: [{ id: "1", parentId: "0", name: "Lobby" }],
    activeChannelId: "1",
    messages: {
      "1": [
        { id: "m", targetId: "1", sender: "Ada", body: "hello", timestamp: 0 },
      ],
    },
  };
  const setup = await testRender(
    () => <TstuiApp state={state} dispatch={() => undefined} />,
    { width: 70, height: 20 },
  );
  await setup.renderOnce();
  const frame = setup.captureCharFrame();
  setup.renderer.destroy();
  expect(frame).toContain("Demo Server");
  expect(frame).toContain("Ada: hello");
  expect(frame).toContain("voice unavailable");
});
