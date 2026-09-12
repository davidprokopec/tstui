# tstui

An experimental, standalone-first TeamSpeak terminal client built with Bun, TypeScript, Effect, Solid and OpenTUI.

> **M1 status:** the first offline interaction slice is implemented: keyboard focus and channel-tree navigation/joining. Composer, private chats, help and connect UX remain planned. Real TeamSpeak connectivity, voice, file transfer, binaries and OpenCode hosting are not shipped.

## Capability status

| Capability                                       | Status                    | Evidence                         |
| ------------------------------------------------ | ------------------------- | -------------------------------- |
| Offline server/channel/client/chat demo          | Tested                    | `bun test`; `bun run demo:smoke` |
| HoneyBBQ identity + client initialization on Bun | Tested without network    | `bun run spike:honeybbq`         |
| Live TeamSpeak text connection                   | Unverified / gated for M3 | No external server was contacted |
| Voice/audio                                      | Unavailable               | Deliberately deferred to M6      |
| File transfer                                    | Unavailable               | Not implemented                  |
| OpenCode v2 host                                 | Planned for M8            | No plugin package exists         |
| Prebuilt binaries / releases                     | Unavailable               | Source execution only            |

## Run the demo

Requirements: [Bun 1.4.2](https://bun.sh/).

```sh
bun install --frozen-lockfile
bun run tstui -- --demo
```

Use `j`/`k` or the arrow keys to move the channel cursor, `Enter` to join the selected channel, `Tab`/`Shift-Tab` to cycle focus, and `q` to exit. The demo still starts with a deterministic scripted message. Composer, private chats, help, and connect UX are later M1 slices.

For a non-interactive render check:

```sh
bun run demo:smoke
```

## Architecture

The dependency direction is `UI -> commands -> projected state -> domain services -> adapters`. Core owns Effect services, bounded command/event channels and a `SubscriptionRef` projection. UI code receives state and command dispatch capabilities; it cannot access protocol, audio, filesystem or renderer construction. The standalone app owns exactly one renderer. See [`docs/adr`](docs/adr/).

## Development

```sh
bun run format:check
bun run lint
bun run typecheck
bun test
bun run build
bun run demo:built:smoke
bun run check
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [roadmap](docs/ROADMAP.md).

## License

[MIT](LICENSE)
