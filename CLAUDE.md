# kos-kit

This file captures gotchas, non-obvious rules, and things that were repeatedly mistaken. Not for basic structure or obvious patterns — those are derivable from the code.

## TypeScript

- **No `as` type assertions.** Never use `as` for typecasting. Use type guards (`instanceof`, `in`, `typeof`), narrowing, or fix the types at the source. If a type doesn't fit, the type definition is wrong — fix that instead of casting.
- **No `any`.** Use `unknown` and narrow with type guards.
- **`typeof globalThis.fetch` in Bun includes extra properties** (like `preconnect`). Don't use it as a type for injectable fetch functions. Narrow to `(url: string, init?: RequestInit) => Promise<Response>`.

## Repo Layout Gotchas

- **Git root is `~/.kos-kit/`, not `~/.kos-kit/cli/`.** The lockfile (`bun.lock`) lives at repo root. `prek.toml` lives at repo root. Don't put repo-level config inside `cli/`.
- **prek hooks run from repo root.** Biome and tsc entries in `prek.toml` need `cli/` prefixes for paths (e.g., `--config-path cli/biome.json`, `-p cli/tsconfig.json`, file patterns like `cli/.*\\.ts$`).
