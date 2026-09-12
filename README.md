# tstui

An experimental, standalone-first TeamSpeak terminal client built with Bun, TypeScript, Effect, Solid and OpenTUI.

> **M0 status:** the offline demo is implemented and tested. Real TeamSpeak connectivity, voice, file transfer, binaries and OpenCode hosting are not shipped.

## Capability status

| Capability                                       | Status                    | Evidence                         |
| ------------------------------------------------ | ------------------------- | -------------------------------- |
| Offline server/channel/client/chat demo          | Tested                    | `bun test`; `bun run demo:smoke` |
| HoneyBBQ identity + client initialization on Bun | Tested without network    | `bun run spike:honeybbq`         |
| Live TeamSpeak text connection                   | Unverified / gated for M1 | No external server was contacted |
| Voice/audio                                      | Unavailable               | Deliberately deferred to M3      |
| File transfer                                    | Unavailable               | Not implemented                  |
| OpenCode v2 host                                 | Planned for M4            | No plugin package exists         |
| Prebuilt binaries / releases                     | Unavailable               | Source execution only            |

## Run the demo

Requirements: [Bun 1.4.2](https://bun.sh/).

```sh
bun install --frozen-lockfile
bun run tstui -- --demo
```

Press `q` to exit. The current M0 interface displays the deterministic demo, joins the Development channel and sends a scripted message. A full interactive composer and navigation are marked for M2.

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
