import type { KeymapEvent, Layer as KeymapLayer } from "@opentui/keymap";
import type { AppState, CommandInvocation } from "@tstui/core";

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
  getState: () => AppState,
  onQuit: () => void,
): (() => void) => {
  const layers: ReadonlyArray<KeymapLayer<TTarget, TEvent>> = [
    {
      priority: 100,
      bindings: [{ key: "q", cmd: "quit" }],
      commands: [
        {
          name: "quit",
          run: (): void => {
            dispatch({ id: "quit", args: {} });
            onQuit();
          },
        },
      ],
    },
    {
      priority: 90,
      bindings: [
        { key: "tab", cmd: "focus-next" },
        { key: "shift+tab", cmd: "focus-prev" },
      ],
      commands: [
        {
          name: "focus-next",
          run: (): void => dispatch({ id: "focus-next", args: {} }),
        },
        {
          name: "focus-prev",
          run: (): void => dispatch({ id: "focus-prev", args: {} }),
        },
      ],
    },
    {
      priority: 80,
      bindings: [
        { key: "j", cmd: "tree-down" },
        { key: "down", cmd: "tree-down" },
        { key: "k", cmd: "tree-up" },
        { key: "up", cmd: "tree-up" },
        { key: "return", cmd: "join-channel" },
      ],
      commands: [
        {
          name: "tree-down",
          run: (): void => {
            if (getState().focus === "tree")
              dispatch({ id: "tree-down", args: {} });
          },
        },
        {
          name: "tree-up",
          run: (): void => {
            if (getState().focus === "tree")
              dispatch({ id: "tree-up", args: {} });
          },
        },
        {
          name: "join-channel",
          run: (): void => {
            if (getState().focus === "tree")
              dispatch({ id: "join-channel", args: {} });
          },
        },
      ],
    },
  ];
  const disposers = layers.map((layer) => keymap.registerLayer(layer));
  return (): void => {
    for (const dispose of disposers.reverse()) dispose();
  };
};
