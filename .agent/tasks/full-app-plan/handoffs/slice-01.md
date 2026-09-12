# EX1-M1-S1 handoff

Outcome: Implemented M1-S1 on `feat/m1-focus-tree-navigation` from the exact
baseline. Focus cycles between tree and chat, tree cursor commands clamp at
bounds, Enter joins the selected channel through the fake adapter, keymaps are
focus-gated, global `q` remains available, and selected/joined/focused state is
visible. Public docs mark only the first M1 slice complete.

Files: Changed focused state/events/commands/fake behavior under
`packages/core`, keymaps and rendering under `packages/tui`, standalone wiring
and integration tests under `packages/app`, plus `README.md` and
`docs/ROADMAP.md`. Evidence is in this handoff and
`.agent/tasks/full-app-plan/test-reports/slice-01.md`.

Verification: `bun install --frozen-lockfile`, `bun run check`, both source and
built demo smoke commands, `bun test packages/core packages/tui packages/app`,
targeted keymap/reactivity tests, static architecture/pin/suppression checks,
and a bounded PTY navigate/join/quit/restoration run all passed. Detailed
observed results are in the test report.

Risks: Focus-next and focus-prev intentionally cycle only the currently visible
tree/chat panels in S1; help/connect focus values are reserved for later M1
slices. `ChannelJoined` was added to preserve the semantic distinction between
tree selection and active channel without deriving self identity from adapter
specific client IDs. No live TeamSpeak behavior was tested or claimed.

Follow-up: Parent should validate this handoff and obtain independent review of
the branch commits before integrating. Do not start M1-S2 until this slice is
accepted.

```json
{
  "version": 1,
  "taskId": "EX1-M1-S1",
  "status": "completed",
  "outcome": "Implemented and locally verified keyboard focus cycling plus bounded channel-tree navigation and selected-channel joining against the fake adapter.",
  "facts": [
    {
      "statement": "Implementation commits f830ca9 and 3db79a2 descend from baseline 575fe652da514b07f59eb84b3245f8ab55c0fc71.",
      "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"]
    },
    {
      "statement": "All required automated, smoke, static, and bounded PTY checks passed.",
      "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"]
    },
    {
      "statement": "No network or live TeamSpeak endpoint was accessed.",
      "evidenceRefs": ["README.md", ".agent/tasks/full-app-plan/test-reports/slice-01.md"]
    }
  ],
  "assumptions": [
    {
      "id": "S1-FOCUS-SCOPE",
      "statement": "Only tree and chat are visible focus-cycle targets until later M1 slices implement help and connect UX.",
      "status": "accepted",
      "evidence": [".agent/tasks/full-app-plan/decisions/master-plan.md", "packages/core/src/commands/index.ts"]
    }
  ],
  "filesRead": [
    { "path": ".agent/tasks/full-app-plan/decisions/master-plan.md", "scope": "M1-S1 requirements and invariants" },
    { "path": "packages/core", "scope": "existing state, events, commands, adapters, and tests" },
    { "path": "packages/tui", "scope": "existing keymaps, views, and render tests" },
    { "path": "packages/app", "scope": "existing runtime wiring and tests" }
  ],
  "filesChanged": [
    { "path": "packages/core", "scope": "focus/selection state, semantic events, centralized commands, fake join behavior, reducer and command tests" },
    { "path": "packages/tui", "scope": "global/tree keymap layers, focus gating, cursor/focus rendering, reactive tests" },
    { "path": "packages/app", "scope": "reactive keymap state wiring, scripted smoke preservation, actual input integration tests" },
    { "path": "README.md", "scope": "truthful S1 controls and capability status" },
    { "path": "docs/ROADMAP.md", "scope": "current master-plan milestone summary" },
    { "path": ".agent/tasks/full-app-plan/test-reports/slice-01.md", "scope": "verification evidence" },
    { "path": ".agent/tasks/full-app-plan/handoffs/slice-01.md", "scope": "worker handoff" }
  ],
  "verification": [
    { "command": "bun install --frozen-lockfile", "status": "pass", "result": "167 installs checked; no changes", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bun run check", "status": "pass", "result": "format, lint/boundaries, typecheck, 29 tests/85 assertions, and build passed", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bun run demo:smoke", "status": "pass", "result": "source smoke frame complete", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bun run demo:built:smoke", "status": "pass", "result": "built smoke frame complete", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bun test packages/core packages/tui packages/app", "status": "pass", "result": "29 passed, 0 failed, 85 assertions", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "bounded Python openpty navigate+join+q harness", "status": "pass", "result": "exit=0, terminal_restored=true, joined Effect cursor observed", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] },
    { "command": "architecture, pin, and suppression scans", "status": "pass", "result": "no prohibited source hits or direct dependency ranges", "evidenceRefs": [".agent/tasks/full-app-plan/test-reports/slice-01.md"] }
  ],
  "risks": [
    { "severity": "low", "statement": "Help and connect focus targets remain intentionally unavailable until their planned slices." },
    { "severity": "medium", "statement": "Live transport join semantics remain unverified and capability-gated." }
  ],
  "followUp": "Validate the handoff, independently review the commits, and integrate M1-S1 before dispatching M1-S2.",
  "artifactRefs": [
    { "kind": "file", "reference": ".agent/tasks/full-app-plan/test-reports/slice-01.md", "description": "Complete local verification evidence" },
    { "kind": "file", "reference": ".agent/tasks/full-app-plan/handoffs/slice-01.md", "description": "Worker handoff" }
  ],
  "reviewState": "not-requested"
}
```

## Status

complete — implementation and evidence are ready for parent validation and
independent review.
