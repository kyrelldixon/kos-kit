# kos-kit

This file captures gotchas, non-obvious rules, and things that were repeatedly mistaken. Not for basic structure or obvious patterns — those are derivable from the code.

## TypeScript

- **No `as` type assertions.** Never use `as` for typecasting. Use type guards (`instanceof`, `in`, `typeof`), narrowing, or fix the types at the source. If a type doesn't fit, the type definition is wrong — fix that instead of casting.
- **No `any`.** Use `unknown` and narrow with type guards.
- **`typeof globalThis.fetch` in Bun includes extra properties** (like `preconnect`). Don't use it as a type for injectable fetch functions. Narrow to `(url: string, init?: RequestInit) => Promise<Response>`.

## Testing

- **Co-locate test files next to source files.** `src/lib/api.ts` → `src/lib/api.test.ts`, `src/commands/jobs.ts` → `src/commands/jobs.test.ts`. Never put tests in a separate `tests/` directory.
- **Narrow discriminated unions before accessing variant-specific fields.** `CLIResponse` has `.result` only on `SuccessResponse` — always check `if (result.ok)` before accessing `result.result`.

## Secrets / Varlock

- **NEVER use `varlock printenv`.** It dumps raw secret values to stdout — they leak into logs, terminal history, and tool output. Always use `varlock run -- <command>` to inject env vars into a subprocess environment.

## Repo Layout Gotchas

- **Git root is `~/.kos-kit/`, not `~/.kos-kit/cli/`.** The lockfile (`bun.lock`) lives at repo root. `prek.toml` lives at repo root. Don't put repo-level config inside `cli/`.
- **prek hooks run from repo root.** Biome and tsc entries in `prek.toml` need `cli/` prefixes for paths (e.g., `--config-path cli/biome.json`, `-p cli/tsconfig.json`, file patterns like `cli/.*\\.ts$`).
