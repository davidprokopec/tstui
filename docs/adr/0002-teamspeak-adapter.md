# ADR 0002: TeamSpeak adapter

Status: accepted with capability gate (2026-09-12)

Pin `@honeybbq/teamspeak-client@0.2.3` behind `TeamSpeakPort`. It is a real client protocol implementation rather than ServerQuery, but declares Node support and is young. M0 verifies identity roundtrip, disconnected client initialization, and normalization on Bun; it does not contact a server. Live connectivity stays gated to M1. ReSpeak IPC remains a possible fallback only after evidence shows it is needed. Voice and files are unavailable.
