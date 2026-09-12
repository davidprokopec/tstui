import { expect, test } from "bun:test";
import {
  normalizeChannel,
  normalizeClient,
  normalizeMessage,
} from "../src/index.js";

test("HoneyBBQ protocol values are copied into domain values", () => {
  expect(
    normalizeChannel({ id: 2n, parentID: 0n, name: "Dev", description: "" }),
  ).toEqual({ id: "2", parentId: "0", name: "Dev" });
  expect(
    normalizeClient({
      id: 4,
      channelID: 2n,
      nickname: "Lin",
      uid: "u",
      serverGroups: [],
      type: 0,
    }),
  ).toEqual({ id: "4", channelId: "2", nickname: "Lin" });
  const message = normalizeMessage(
    {
      invokerName: "Lin",
      invokerUID: "u",
      message: "hi",
      invokerGroups: [],
      targetMode: 2,
      targetID: 2n,
      invokerID: 4,
    },
    "m",
    5,
  );
  expect(message.body).toBe("hi");
  expect(message.timestamp).toBe(5);
});
