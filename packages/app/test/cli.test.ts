import { expect, test } from "bun:test";
import { parseCli } from "../src/cli.js";

test("CLI parses demo connection flags", () => {
  expect(
    parseCli(["--demo", "--server", "example.test", "--nickname", "Ada"]),
  ).toEqual({
    demo: true,
    smoke: false,
    server: "example.test",
    nickname: "Ada",
  });
});
