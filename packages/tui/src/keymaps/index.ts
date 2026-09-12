import type { KeymapEvent, Layer as KeymapLayer } from "@opentui/keymap";
import type { CommandInvocation } from "@tstui/core";

export interface KeymapRegistrar<
  TTarget extends object,
  TEvent extends KeymapEvent,
> {
  readonly registerLayer: (layer: KeymapLayer<TTarget, TEvent>) => () => void;
}

export const installKeymaps = <
  TTarget extends object,
  TEvent extends KeymapEvent,
>(
  keymap: KeymapRegistrar<TTarget, TEvent>,
  dispatch: (command: CommandInvocation) => void,
  onQuit: () => void,
): (() => void) => {
  const run =
    (id: string, args: Readonly<Record<string, string>> = {}) =>
    (): void =>
      dispatch({ id, args });
  const layers: ReadonlyArray<KeymapLayer<TTarget, TEvent>> = [
    {
      priority: 100,
      bindings: [
        { key: "q", cmd: "quit" },
        { key: "?", cmd: "help" },
      ],
      commands: [
        { name: "quit", run: (): void => onQuit() },
        { name: "help", run: run("open-private-chat", { targetId: "help" }) },
      ],
    },
    {
      priority: 20,
      bindings: [{ key: "enter", cmd: "join-channel" }],
      commands: [
        { name: "join-channel", run: run("join-channel", { channelId: "1" }) },
      ],
    },
    {
      priority: 10,
      bindings: [{ key: "ctrl+enter", cmd: "send-message" }],
      commands: [
        {
          name: "send-message",
          run: run("send-message", { targetId: "1", body: "Hello from tstui" }),
        },
      ],
    },
  ];
  const disposers = layers.map((layer) => keymap.registerLayer(layer));
  return (): void => {
    for (const dispose of disposers.reverse()) dispose();
  };
};
