import { Effect, Schedule } from "effect";
import type { ConnectionError } from "./domain/errors.js";

export const reconnectSchedule = Schedule.exponential("100 millis").pipe(
  Schedule.jittered,
);
export const reconnect = <A>(
  operation: Effect.Effect<A, ConnectionError>,
): Effect.Effect<A, ConnectionError> =>
  operation.pipe(
    Effect.retry({
      schedule: reconnectSchedule,
      times: 4,
      while: (error) => error.transient,
    }),
  );
