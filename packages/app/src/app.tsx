import { createCliRenderer } from "@opentui/core";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { render, testRender } from "@opentui/solid";
import { Effect, Fiber, ManagedRuntime, Stream, SubscriptionRef } from "effect";
import { createSignal, onCleanup } from "solid-js";
import {
  CommandService,
  type CommandInvocation,
  ProjectionService,
  makeAppLayer,
} from "@tstui/core";
import { installKeymaps, TstuiApp } from "@tstui/tui";
import { parseCli } from "./cli.js";
import { withRenderer } from "./lifecycle.js";

export const run = async (args: ReadonlyArray<string>): Promise<void> => {
  const options = parseCli(args);
  if (!options.demo)
    throw new Error(
      "Live HoneyBBQ mode is capability-gated and unverified. Use --demo or run the documented spike.",
    );
  const runtime = ManagedRuntime.make(makeAppLayer(true));
  try {
    await runtime.runPromise(
      CommandService.use((commands) =>
        commands.execute({
          id: "connect",
          args: { server: options.server, nickname: options.nickname },
        }),
      ),
    );
    await runtime.runPromise(
      ProjectionService.use((projection) =>
        SubscriptionRef.changes(projection.state).pipe(
          Stream.filter(
            (state) =>
              state.phase === "connected" && state.selectedChannelId !== null,
          ),
          Stream.runHead,
          Effect.asVoid,
        ),
      ),
    );
    await runtime.runPromise(
      CommandService.use((commands) =>
        commands.execute({ id: "select-channel", args: { channelId: "2" } }),
      ),
    );
    await runtime.runPromise(
      ProjectionService.use((projection) =>
        SubscriptionRef.changes(projection.state).pipe(
          Stream.filter((state) => state.selectedChannelId === "2"),
          Stream.runHead,
          Effect.asVoid,
        ),
      ),
    );
    await runtime.runPromise(
      CommandService.use((commands) =>
        commands.execute({ id: "join-channel", args: {} }),
      ),
    );
    await runtime.runPromise(
      CommandService.use((commands) =>
        commands.execute({
          id: "send-message",
          args: { targetId: "2", body: "Effect services are online." },
        }),
      ),
    );
    const state = await runtime.runPromise(
      ProjectionService.use((projection) => projection.snapshot),
    );
    const dispatch = (command: CommandInvocation): void => {
      runtime.runFork(
        CommandService.use((commands) => commands.dispatch(command)),
      );
    };

    if (options.smoke) {
      const setup = await testRender(
        () => <TstuiApp state={state} dispatch={dispatch} />,
        { width: 80, height: 24 },
      );
      await setup.renderOnce();
      const frame = setup.captureCharFrame();
      setup.renderer.destroy();
      if (
        !frame.includes("tstui demo") ||
        !frame.includes("Effect services are online.")
      )
        throw new Error("Demo smoke frame was incomplete");
      console.log(frame);
      return;
    }

    await withRenderer(
      () => createCliRenderer(),
      async (ownedRenderer) => {
        const renderer = ownedRenderer;
        let finish: (() => void) | undefined;
        const stopped = new Promise<void>((resolve) => {
          finish = resolve;
        });
        const keymap = createDefaultOpenTuiKeymap(renderer);
        let readState = (): typeof state => state;
        const disposeKeymaps = installKeymaps(
          keymap,
          dispatch,
          () => readState(),
          () => finish?.(),
        );
        try {
          await render(() => {
            const [currentState, setCurrentState] = createSignal(state);
            readState = currentState;
            const projectionFiber = runtime.runFork(
              ProjectionService.use((projection) =>
                SubscriptionRef.changes(projection.state).pipe(
                  Stream.runForEach((nextState) =>
                    Effect.sync(() => setCurrentState(nextState)),
                  ),
                ),
              ),
            );
            onCleanup(() => {
              Effect.runFork(Fiber.interrupt(projectionFiber));
            });
            return <TstuiApp state={currentState()} dispatch={dispatch} />;
          }, renderer);
          await stopped;
        } finally {
          disposeKeymaps();
        }
      },
    );
  } finally {
    await runtime.dispose();
  }
};
