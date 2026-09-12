import { expect, test } from "bun:test";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { testRender } from "@opentui/solid";
import { installKeymaps } from "@tstui/tui";

test("default OpenTUI keymap dispatches q to quit", async () => {
  const setup = await testRender(() => null, { width: 40, height: 10 });
  let quit = false;
  let command = "";
  const dispose = installKeymaps(
    createDefaultOpenTuiKeymap(setup.renderer),
    (invocation) => {
      command = invocation.id;
    },
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
