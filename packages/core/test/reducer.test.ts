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

  test("keeps tree selection distinct from the joined channel", () => {
    const connected = reduceEvent(initialState, {
      _tag: "ConnectionChanged",
      phase: "connected",
      server: { id: "s", name: "Server" },
    });
    const withChannels = reduceEvent(connected, {
      _tag: "ChannelListUpdated",
      channels: [
        { id: "1", parentId: "0", name: "Lobby" },
        { id: "2", parentId: "0", name: "Development" },
      ],
    });
    const joined = reduceEvent(withChannels, {
      _tag: "ChannelJoined",
      channelId: "1",
    });
    const selected = reduceEvent(joined, {
      _tag: "ChannelSelected",
      channelId: "2",
    });
    const focused = reduceEvent(selected, {
      _tag: "FocusChanged",
      focus: "chat",
    });

    expect(focused.activeChannelId).toBe("1");
    expect(focused.selectedChannelId).toBe("2");
    expect(focused.focus).toBe("chat");
  });

  test("replaces removed selections with a valid deterministic fallback", () => {
    const state = {
      ...initialState,
      channels: [
        { id: "1", parentId: "0", name: "Lobby" },
        { id: "2", parentId: "0", name: "Development" },
      ],
      selectedChannelId: "2",
    };
    const replacement = reduceEvent(state, {
      _tag: "ChannelListUpdated",
      channels: [
        { id: "3", parentId: "0", name: "Support" },
        { id: "4", parentId: "0", name: "Games" },
      ],
    });
    const removed = reduceEvent(replacement, {
      _tag: "ChannelListUpdated",
      channels: [],
    });

    expect(replacement.selectedChannelId).toBe("3");
    expect(removed.selectedChannelId).toBeNull();
  });

  test("ignores channel selections that are not in the projected tree", () => {
    const state = {
      ...initialState,
      channels: [{ id: "1", parentId: "0", name: "Lobby" }],
      selectedChannelId: "1",
    };

    expect(
      reduceEvent(state, { _tag: "ChannelSelected", channelId: "bot" }),
    ).toBe(state);
  });
});
