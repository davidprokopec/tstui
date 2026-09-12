# EX1B-M1-S1-fixes handoff

Outcome: Fixed both findings from the first M1-S1 review. Invalid channel IDs
are rejected with typed errors, direct invalid selection events are ignored,
and deferred private-chat commands return an explicit typed unavailable error
without moving the tree cursor. New command enablement, bounds, replacement,
and removal cases now have deterministic regressions.

Files: The fix changes only `packages/core/src/commands/index.ts`,
`packages/core/src/state.ts`, their command/reducer tests, and the assigned
handoff/test report. Earlier M1-S1 files remain unchanged by this fix task.

Verification: `bun install --frozen-lockfile`, `bun run check`, both source and
built demo smoke commands, `bun test packages/core packages/tui packages/app`,
targeted keymap/reactivity tests, static architecture/pin/suppression checks,
and a bounded PTY navigate/join/quit/restoration run all passed. Detailed
observed results are in the test report.

Risks: `open-private-chat` remains intentionally unavailable until M1-S3. No
live TeamSpeak behavior was tested or claimed. The PTY harness required a
bounded shutdown allowance after `q`; terminal attributes were restored.

Follow-up: Parent should validate this handoff and request exact-HEAD re-review
of the branch before integrating M1-S1.

```json
{
  "version": 1,
  "taskId": "EX1B-M1-S1-fixes",
  "status": "completed",
  "outcome": "Fixed both review findings by preserving valid channel selection, rejecting invalid/private targets with typed errors, and completing focus/tree enablement and replacement coverage.",
  "facts": [
    {
      "statement": "Fix commit e73175c descends from reviewed head 4102b3002bb6c3ed850a802f320bd9e208576410 on feat/m1-focus-tree-navigation.",
      "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"]
    },
    {
      "statement": "Invalid channel and private-chat target reproductions now return typed CommandError values without changing selectedChannelId.",
      "evidenceRefs": ["packages/core/test/commands.test.ts", ".agent/tasks/full-app-plan/test-reports/slice-01.md"]
    },
    {
      "statement": "All required automated, smoke, static, and bounded PTY checks passed with 33 full-suite tests and 104 assertions.",
      "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"]
    },
    {
      "statement": "No network or live TeamSpeak endpoint was accessed.",
      "evidenceRefs": ["README.md", ".agent/tasks/full-app-plan/test-reports/slice-01.md"]
    }
  ],
  "assumptions": [
    {
      "id": "S1-PRIVATE-DEFERRED",
      "statement": "Private chat remains unavailable until M1-S3 and must not mutate channel selection in M1-S1.",
      "status": "accepted",
      "evidence": [".agent/tasks/full-app-plan/decisions/master-plan.md", "packages/core/src/commands/index.ts"]
    }
  ],
  "filesRead": [
    { "path": ".agent/tasks/full-app-plan/reviews/slice-01.md", "scope": "persisted review findings and reproduction" },
    { "path": "packages/core/src/commands/index.ts", "scope": "command validation and enablement" },
    { "path": "packages/core/src/state.ts", "scope": "selection invariant and channel replacement fallback" },
    { "path": "packages/core/test", "scope": "existing command and reducer coverage" }
  ],
  "filesChanged": [
    { "path": "packages/core/src/commands/index.ts", "scope": "typed invalid-channel validation and deferred private-chat rejection" },
    { "path": "packages/core/src/state.ts", "scope": "ignore invalid selection events while retaining deterministic list fallback" },
    { "path": "packages/core/test/commands.test.ts", "scope": "complete enablement, bounds, invalid-target, and private-target regressions" },
    { "path": "packages/core/test/reducer.test.ts", "scope": "replacement, removal, and invalid selection regressions" },
    { "path": ".agent/tasks/full-app-plan/test-reports/slice-01.md", "scope": "verification evidence" },
    { "path": ".agent/tasks/full-app-plan/handoffs/slice-01.md", "scope": "worker handoff" }
  ],
  "verification": [
    { "command": "bun install --frozen-lockfile", "status": "pass", "result": "167 installs checked; no changes", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bun run check", "status": "pass", "result": "format, lint/boundaries, typecheck, 33 tests/104 assertions, and build passed", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bun run demo:smoke", "status": "pass", "result": "source smoke frame complete", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bun run demo:built:smoke", "status": "pass", "result": "built smoke frame complete", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bun test packages/core packages/tui packages/app", "status": "pass", "result": "33 passed, 0 failed, 104 assertions", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bun test packages/core/test/commands.test.ts -t 'invalid channel and deferred private targets'", "status": "pass", "result": "reviewer reproduction passed with 1 test and 5 assertions", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bounded Python openpty navigate+join+q harness", "status": "pass", "result": "exit=0, terminal_restored=true, joined Effect cursor observed", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "architecture, pin, and suppression scans", "status": "pass", "result": "no prohibited source hits or direct dependency ranges", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] }
  ],
  "risks": [
    { "severity": "low", "statement": "Private chat remains intentionally unavailable until M1-S3." },
    { "severity": "medium", "statement": "Live transport join semantics remain unverified and capability-gated." }
  ],
  "followUp": "Validate the handoff and request exact-HEAD re-review before integrating M1-S1.",
  "artifactRefs": [
    { "kind": "file", "reference": ".agent/tasks/full-app-plan/test-reports/slice-01.md", "description": "Complete local verification evidence" },
    { "kind": "file", "reference": ".agent/tasks/full-app-plan/handoffs/slice-01.md", "description": "Worker handoff" }
  ],
  "reviewState": "pending"
}
```

## Status

complete — implementation and evidence are ready for parent validation and
independent review.
