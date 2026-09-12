import { Context, Effect, Layer } from "effect";
import { PersistenceError } from "../domain/errors.js";

export interface PersistenceShape {
  readonly loadIdentity: Effect.Effect<string | null, PersistenceError>;
  readonly saveIdentity: (
    identity: string,
  ) => Effect.Effect<void, PersistenceError>;
}
export class PersistencePort extends Context.Service<
  PersistencePort,
  PersistenceShape
>()("@tstui/PersistencePort") {}
export const PersistenceMemory = Layer.effect(
  PersistencePort,
  Effect.sync(() => {
    let value: string | null = null;
    return PersistencePort.of({
      loadIdentity: Effect.sync(() => value),
      saveIdentity: Effect.fn("Persistence.saveIdentity")((identity: string) =>
        Effect.sync(() => {
          value = identity;
        }),
      ),
    });
  }),
);
