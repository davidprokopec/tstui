# M1-S1 verification report

Implementation commits: `f830ca9` (`feat: add focus and channel tree
navigation`), `3db79a2` (`test: cover reverse focus cycling`), and `e73175c`
(`fix: preserve channel tree selection invariants`).
Baseline: `575fe652da514b07f59eb84b3245f8ab55c0fc71`.

## Automated verification

- `bun install --frozen-lockfile` — pass; 167 installs checked, no changes.
- `bun run check` — pass: Prettier, oxlint (0 warnings/errors), boundary check,
  TypeScript build, 33 tests / 104 assertions, and application build.
- `bun run demo:smoke` — pass; frame contained `tstui demo`, scripted message,
  selected/joined Development marker, and `focus tree` status.
- `bun run demo:built:smoke` — pass after the completed build; same source smoke
  contract and focus/cursor markers were present.
- `bun test packages/core packages/tui packages/app` — pass: 33 tests, 0
  failures, 104 assertions.
- Targeted keymap/reactivity/integration command:
  `bun test packages/core/test/commands.test.ts packages/core/test/reducer.test.ts packages/app/test/keymaps.test.ts packages/tui/test/render.test.tsx`
  — pass: 14 tests, 0 failures, 53 assertions. Coverage includes real OpenTUI
  mock key input, focus gating, reducer distinction between selected and active
  channels, cursor bounds, channel-list replacement/removal, selection
  re-rendering, and fake-adapter joining.
- Reviewer private-target reproduction:
  `bun test packages/core/test/commands.test.ts -t 'invalid channel and deferred private targets'`
  — pass: 1 test, 5 assertions. Both invalid `select-channel` and the reproduced
  `open-private-chat { targetId: "bot" }` return typed `CommandError` values and
  leave the valid channel cursor unchanged.
- `git diff --check` — pass.
- Suppression scan over source and tests for `any`, `@ts-ignore`, and
  `@ts-expect-error` — no hits.
- Direct-dependency range scan over root and workspace `package.json` files —
  no `^` or `~` pins.
- Boundary scans — no OpenTUI/Solid/OpenCode imports in core; no filesystem,
  protocol-client, or adapter imports in TUI; `createCliRenderer` remains only
  in `packages/app/src/app.tsx` outside generated output.

## PTY navigate, join, quit, restore

A bounded Python `openpty` harness launched
`bun packages/app/src/main.ts --demo` in an 80x24 slave terminal. After a
2.5-second startup bound it sent `j`, Return, and `q`, allowed 0.5 seconds for
shutdown, repeated `q` only if the process was still exiting, then waited at
most five seconds. It compared the slave's `termios.tcgetattr` state before and
after execution.

Observed result:

```text
exit=0 terminal_restored=True captured_bytes=11857 joined_effect=True
```

The captured frames contained `>* # Effect`, proving the cursor navigated from
Development to Effect and Enter joined the selected channel before global `q`
exited. Terminal attributes exactly matched their pre-launch values.

The first fix-verification harness run used shorter shutdown timing and timed
out; it was killed. Increasing only the harness timing bounds produced the
passing run above; no application code changed between those attempts.

## Status

complete — all required slice and baseline checks passed locally without
network access.
