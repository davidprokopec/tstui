# Repository guidance

- Preserve `UI -> commands -> projected state -> domain services -> adapters`.
- `packages/core` must stay renderer/OpenCode-free; `packages/tui` must stay protocol/filesystem-free.
- The standalone app is the only renderer owner.
- Keep dependencies exact, errors typed with Effect Schema, and resources scoped.
- Never claim live TeamSpeak, audio, plugin, binary or release support without direct test evidence.
- Run `bun run check` and `bun run demo:smoke` after source changes.
