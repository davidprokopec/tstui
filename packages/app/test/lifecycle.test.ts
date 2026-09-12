import { expect, test } from "bun:test";
import { withRenderer } from "../src/lifecycle.js";

test("renderer is destroyed when rendering fails", async () => {
  let destroyed = false;
  await expect(
    withRenderer(
      async () => ({
        destroy: (): void => {
          destroyed = true;
        },
      }),
      async () => {
        throw new Error("render failed");
      },
    ),
  ).rejects.toThrow("render failed");
  expect(destroyed).toBe(true);
});
