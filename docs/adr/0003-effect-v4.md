# ADR 0003: Effect v4 foundation

Status: accepted (2026-09-12)

Pin `effect@4.0.0-rc.115`. Current APIs use `Context.Service`, `Layer.effect` (including scoped construction), `PubSub.bounded`, `Queue.make`, `Stream.fromPubSub`, `SubscriptionRef`, Schema tagged unions and `Schema.TaggedError`. Public workflows use `Effect.fn`; reconnect uses a bounded retry count and jittered exponential Schedule. Tests use `effect/testing` TestClock. The release candidate is intentionally isolated in core because APIs may change before stable v4.
