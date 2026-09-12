import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Config, Effect, Layer } from "effect";
import { PersistenceError } from "../../domain/errors.js";
import { PersistencePort } from "../../ports/persistence.js";

const failure = (cause: unknown): PersistenceError =>
  new PersistenceError({ message: String(cause) });

export const PersistenceFileLive = Layer.effect(
  PersistencePort,
  Effect.gen(function* () {
    const home = yield* Config.String("HOME");
    const configHome = yield* Config.String("XDG_CONFIG_HOME").pipe(
      Config.withDefault(join(home, ".config")),
    );
    const path = join(configHome, "tstui", "identity.txt");
    return PersistencePort.of({
      loadIdentity: Effect.tryPromise({
        try: async () =>
          (await Bun.file(path).exists()) ? await Bun.file(path).text() : null,
        catch: failure,
      }),
      saveIdentity: Effect.fn("PersistenceFile.saveIdentity")(
        (identity: string) =>
          Effect.tryPromise({
            try: async () => {
              await mkdir(dirname(path), { recursive: true });
              await Bun.write(path, identity);
            },
            catch: failure,
          }),
      ),
    });
  }),
);
