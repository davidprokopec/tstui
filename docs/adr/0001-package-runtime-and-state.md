# ADR 0001: Package, runtime and state graph

Status: accepted (2026-09-12)

Use Bun workspaces with `core`, host-neutral `tui`, and standalone `app`. Dependencies flow from UI commands to the projected state and services, then adapters. Effect v4 services and Layers own a bounded `PubSub`, a bounded dropping command `Queue`, and one projection fiber updating `SubscriptionRef<AppState>`. `ManagedRuntime` exists only at the imperative app bridge. Socket/callback resources belong to Effect scopes.

This makes protocol replacement and future hosts possible while preventing renderer and protocol details from crossing boundaries.
