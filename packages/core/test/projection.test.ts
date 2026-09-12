import { expect, test } from "bun:test";
import {
  Effect,
  ManagedRuntime,
  Option,
  Stream,
  SubscriptionRef,
} from "effect";
import {
  CommandService,
  ProjectionService,
  makeAppLayer,
} from "../src/index.js";

test("fake adapter flows through bus and the single projection fiber", async () => {
  const runtime = ManagedRuntime.make(makeAppLayer(true));
  try {
    await runtime.runPromise(
      CommandService.use((service) =>
        service.execute({
          id: "connect",
          args: { server: "demo", nickname: "Test" },
        }),
      ),
    );
    const state = await runtime.runPromise(
      ProjectionService.use((projection) =>
        SubscriptionRef.changes(projection.state).pipe(
          Stream.filter((snapshot) => snapshot.phase === "connected"),
          Stream.runHead,
          Effect.map(Option.getOrThrow),
        ),
      ),
    );
    expect(state.channels.map((channel) => channel.name)).toContain(
      "Development",
    );
    expect(state.capabilities.voice).toBe("unavailable");
  } finally {
    await runtime.dispose();
  }
});
