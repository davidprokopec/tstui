# M1-S1 verification report

Implementation commit: `f830ca9` (`feat: add focus and channel tree navigation`).
Baseline: `575fe652da514b07f59eb84b3245f8ab55c0fc71`.

## Automated verification

- `bun install --frozen-lockfile` — pass; 167 installs checked, no changes.
- `bun run check` — pass: Prettier, oxlint (0 warnings/errors), boundary check,
  TypeScript build, 29 tests / 85 assertions, and application build.
- `bun run demo:smoke` — pass; frame contained `tstui demo`, scripted message,
  selected/joined Development marker, and `focus tree` status.
- `bun run demo:built:smoke` — pass after the completed build; same source smoke
  contract and focus/cursor markers were present.
- `bun test packages/core packages/tui packages/app` — pass: 29 tests, 0
  failures, 85 assertions.
- Targeted keymap/reactivity/integration command:
  `bun test packages/app/test/keymaps.test.ts packages/tui/test/render.test.tsx packages/core/test/commands.test.ts`
  — pass: 7 tests, 0 failures, 25 assertions. Coverage includes real OpenTUI
  mock key input, focus gating, reducer distinction between selected and active
  channels, cursor bounds, selection re-rendering, and fake-adapter joining.
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
two-second startup bound it sent `j`, Return, and `q`, captured output, waited
at most five seconds, and compared the slave's `termios.tcgetattr` state before
and after execution.

Observed result:

```text
exit=0 restored=True bytes=11858 Effect=True joined=True
```

The captured frames contained `>* # Effect`, proving the cursor navigated from
Development to Effect and Enter joined the selected channel before global `q`
exited. Terminal attributes exactly matched their pre-launch values.

An initial harness attempt allowed only one second before input and timed out;
it was killed. Increasing only the harness startup allowance to two seconds
produced the bounded passing run above; no application code changed between
those attempts.

## Status

complete — all required slice and baseline checks passed locally without
network access.
