import { Glob } from "bun";

const rules: ReadonlyArray<readonly [string, RegExp, string]> = [
  [
    "packages/core/src/**/*.{ts,tsx}",
    /@opentui|solid-js|@opencode/,
    "core renderer/host import",
  ],
  [
    "packages/tui/src/**/*.{ts,tsx}",
    /adapters\/|node:fs|node:path|Bun\.file|teamspeak-client/,
    "tui protocol/filesystem import",
  ],
  [
    "packages/{core,tui}/src/**/*.{ts,tsx}",
    /createCliRenderer/,
    "renderer created outside app",
  ],
];

let failed = false;
for (const [pattern, forbidden, label] of rules) {
  for await (const path of new Glob(pattern).scan(".")) {
    if (forbidden.test(await Bun.file(path).text())) {
      console.error(`${label}: ${path}`);
      failed = true;
    }
  }
}
if (failed) process.exitCode = 1;
