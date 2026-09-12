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
  ];
  const disposers = layers.map((layer) => keymap.registerLayer(layer));
  return (): void => {
    for (const dispose of disposers.reverse()) dispose();
  };
};
