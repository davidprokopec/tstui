# ADR 0005: OpenCode lessons and plugin seam

Status: accepted; plugin deferred (2026-09-12)

Research inspected OpenCode dev commit `95daf90670b7c039c436c85537da5fbfe2205b41`. Reuse its ownership lessons, not its unstable API: a host owns renderer, theme, lifecycle and keymap integration. Core therefore imports no OpenCode code and TUI accepts injected capabilities. No plugin package is created in M0. M4 must re-verify and pin a current host before claiming compatibility. `neriousy/opencode-github-browser` was reference-only because no license was discovered; no source was copied.
