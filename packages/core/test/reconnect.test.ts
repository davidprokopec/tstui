import { expect, test } from "bun:test";
import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { ConnectionError, reconnect } from "../src/index.js";

test("reconnect retries transient failures under TestClock", async () => {
  let attempts = 0;
  const operation = Effect.suspend(() => {
    attempts += 1;
    return attempts < 3
      ? new ConnectionError({ message: "temporary", transient: true })
      : Effect.succeed("connected");
  });
  const program = Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(reconnect(operation));
    yield* TestClock.adjust("1 minute");
    return yield* Fiber.join(fiber);
  }).pipe(Effect.provide(TestClock.layer()));
  expect(await Effect.runPromise(program)).toBe("connected");
  expect(attempts).toBe(3);
});
