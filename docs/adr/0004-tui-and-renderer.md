# ADR 0004: TUI components and renderer ownership

Status: accepted (2026-09-12)

Pin `@opentui/core`, `@opentui/solid`, and `@opentui/keymap` at `0.5.11`, with `solid-js@1.9.15`. Components use OpenTUI Solid primitives, injected semantic theme tokens, reactive projected state and command IDs. Keymaps are registered through `createDefaultOpenTuiKeymap` as focus-ready host-neutral layers and return disposers. Only `packages/app` calls `createCliRenderer`; it destroys the renderer in `finally`. `testRender` supplies terminal-neutral visual and key-input tests. The emitted source bundle stays under the app workspace and externalizes `@opentui/core`, so its platform package resolves through the app dependency boundary.

OpenTUI reports a Solid peer warning at install time, but typecheck, rendering tests and smoke pass with the exact pins.
