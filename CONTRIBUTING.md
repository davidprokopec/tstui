# Contributing

Use Bun 1.4.2, create a focused branch, write tests and use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Run `bun run check` before opening a pull request.

Keep the architecture direction documented in README. In particular, do not import adapters, protocol types, filesystem APIs or renderer ownership into `packages/tui`, and do not import UI or OpenCode packages into `packages/core`.

The intended GitHub policy for `master` is pull requests, linear history, required `ci`, and disabled force-push/branch deletion. This policy is documented but has not been applied because this bootstrap has no GitHub remote automation.
