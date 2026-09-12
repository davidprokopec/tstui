import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { makePersistenceFileLayer, PersistencePort } from "../src/index.js";

const roots: Array<string> = [];

const temporaryRoot = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "tstui-persistence-"));
  roots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const save = (root: string, value: string) =>
  PersistencePort.use((persistence) => persistence.saveIdentity(value)).pipe(
    Effect.provide(makePersistenceFileLayer(root)),
  );

const load = (root: string) =>
  PersistencePort.use((persistence) => persistence.loadIdentity).pipe(
    Effect.provide(makePersistenceFileLayer(root)),
  );

describe("file identity persistence", () => {
  test("atomically roundtrips with owner-only POSIX modes", async () => {
    const root = await temporaryRoot();
    await Effect.runPromise(save(root, "synthetic-identity"));
    await Effect.runPromise(save(root, "replacement-identity"));
    expect(await Effect.runPromise(load(root))).toBe("replacement-identity");
    expect(await readFile(join(root, "tstui", "identity.txt"), "utf8")).toBe(
      "replacement-identity",
    );
    expect(await readdir(join(root, "tstui"))).toEqual(["identity.txt"]);
    if (process.platform !== "win32") {
      expect((await lstat(join(root, "tstui"))).mode & 0o777).toBe(0o700);
      expect(
        (await lstat(join(root, "tstui", "identity.txt"))).mode & 0o777,
      ).toBe(0o600);
    }
  });

  test("tightens a pre-existing permissive identity", async () => {
    if (process.platform === "win32") return;
    const root = await temporaryRoot();
    const directory = join(root, "tstui");
    const path = join(directory, "identity.txt");
    await mkdir(directory, { recursive: true, mode: 0o777 });
    await writeFile(path, "synthetic-identity", { mode: 0o666 });
    await chmod(directory, 0o777);
    await chmod(path, 0o666);
    expect(await Effect.runPromise(load(root))).toBe("synthetic-identity");
    expect((await lstat(directory)).mode & 0o777).toBe(0o700);
    expect((await lstat(path)).mode & 0o777).toBe(0o600);
  });

  test("refuses symlinks with a typed failure", async () => {
    if (process.platform === "win32") return;
    const root = await temporaryRoot();
    const directory = join(root, "tstui");
    const outside = join(root, "outside");
    await mkdir(directory, { recursive: true });
    await writeFile(outside, "do-not-read");
    await symlink(outside, join(directory, "identity.txt"));
    expect((await Effect.runPromiseExit(load(root)))._tag).toBe("Failure");
    expect((await Effect.runPromiseExit(save(root, "replacement")))._tag).toBe(
      "Failure",
    );
    expect(await readFile(outside, "utf8")).toBe("do-not-read");
  });

  test("reports corrupt contents as a typed failure", async () => {
    const root = await temporaryRoot();
    const directory = join(root, "tstui");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "identity.txt"), "");
    const exit = await Effect.runPromiseExit(load(root));
    expect(exit._tag).toBe("Failure");
  });
});
