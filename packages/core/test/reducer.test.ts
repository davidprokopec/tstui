import { describe, expect, test } from "bun:test";
import { initialState, reduceEvent } from "../src/index.js";

describe("state projection reducer", () => {
  test("deterministically folds normalized events", () => {
    const events = [
      {
        _tag: "ConnectionChanged",
        phase: "connected",
        server: { id: "s", name: "Server" },
      },
      {
        _tag: "ChannelListUpdated",
        channels: [{ id: "1", parentId: "0", name: "Lobby" }],
      },
      {
        _tag: "ClientListUpdated",
        clients: [{ id: "7", channelId: "1", nickname: "Ada" }],
      },
      { _tag: "ClientMoved", clientId: "7", channelId: "2" },
    ] as const;
    const first = events.reduce(reduceEvent, initialState);
    const second = events.reduce(reduceEvent, initialState);
    expect(first).toEqual(second);
    expect(first.clients[0]?.channelId).toBe("2");
  });
});
