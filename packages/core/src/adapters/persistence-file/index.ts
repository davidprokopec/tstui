import { chmod, lstat, mkdir, open, rename, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { Config, Effect, Layer, Predicate } from "effect";
import { PersistenceError } from "../../domain/errors.js";
import { PersistencePort } from "../../ports/persistence.js";

const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;

const failure = (cause: unknown): PersistenceError =>
  new PersistenceError({ message: String(cause) });

const isMissing = (cause: unknown): boolean =>
  Predicate.hasProperty(cause, "code") && cause.code === "ENOENT";

const ensureDirectory = async (path: string): Promise<void> => {
  await mkdir(path, { recursive: true, mode: DIRECTORY_MODE });
  if (process.platform !== "win32") await chmod(path, DIRECTORY_MODE);
};

const rejectSymlink = async (path: string): Promise<boolean> => {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink())
      throw new Error("Identity path must not be a symlink");
    if (!info.isFile()) throw new Error("Identity path must be a regular file");
    return true;
  } catch (cause) {
    if (isMissing(cause)) return false;
    throw cause;
  }
};

const validateIdentity = (identity: string): string => {
  if (identity.length === 0 || identity.includes("\0"))
    throw new Error("Identity file is corrupt");
  return identity;
};

export const makePersistenceFileLayer = (configHome: string) =>
  Layer.effect(
    PersistencePort,
    Effect.sync(() => {
      const directory = join(configHome, "tstui");
      const path = join(directory, "identity.txt");
      return PersistencePort.of({
        loadIdentity: Effect.tryPromise({
          try: async () => {
            await ensureDirectory(directory);
            if (!(await rejectSymlink(path))) return null;
            const noFollow =
              process.platform === "win32" ? 0 : constants.O_NOFOLLOW;
            const handle = await open(path, constants.O_RDONLY | noFollow);
            try {
              const info = await handle.stat();
              if (!info.isFile())
                throw new Error("Identity path must be a regular file");
              if (process.platform !== "win32") await handle.chmod(FILE_MODE);
              return validateIdentity(await handle.readFile("utf8"));
            } finally {
              await handle.close();
            }
          },
          catch: failure,
        }),
        saveIdentity: Effect.fn("PersistenceFile.saveIdentity")(
          (identity: string) =>
            Effect.tryPromise({
              try: async () => {
                validateIdentity(identity);
                await ensureDirectory(directory);
                await rejectSymlink(path);
                const temporary = join(
                  directory,
                  `.identity-${process.pid}-${crypto.randomUUID()}.tmp`,
                );
                try {
                  const handle = await open(
                    temporary,
                    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
                    FILE_MODE,
                  );
                  try {
                    await handle.writeFile(identity, "utf8");
                    await handle.sync();
                  } finally {
                    await handle.close();
                  }
                  await rename(temporary, path);
                  if (process.platform !== "win32")
                    await chmod(path, FILE_MODE);
                } finally {
                  await rm(temporary, { force: true });
                }
              },
              catch: failure,
            }),
        ),
      });
    }),
  );

export const PersistenceFileLive = Layer.unwrap(
  Config.String("HOME").pipe(
    Effect.flatMap((home) =>
      Config.String("XDG_CONFIG_HOME").pipe(
        Config.withDefault(join(home, ".config")),
      ),
    ),
    Effect.map(makePersistenceFileLayer),
  ),
);
