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

## Manifest

- **Two manifests, one rule.** `mise.toml` holds anything mise's registry can install (languages, most CLIs). `kit.toml` holds the rest (brew, cask, apt, custom installers). Don't add a tool to both.
- **`mise.lock` is committed.** Regenerate by running `mise up <tool>` → `mise install`, then commit the updated `mise.toml` + `mise.lock` together.
- **`kit.toml` schema is validated by `cli/src/lib/manifest.ts`.** Invalid `kind`, unknown `category`, or missing required fields throw at load time. Don't hand-edit without running `bun test src/lib/manifest.test.ts` after.

## Dotfiles (chezmoi)

- **Dotfiles live in `dotfiles/` as chezmoi source state**, not stow packages. Filenames use `dot_` prefix (`dot_zshrc` → `~/.zshrc`). `.tmpl` suffix = Go template processed on apply.
- **Deployed files are copies, not symlinks.** Editing `~/.zshrc` directly won't sync back — edit source via `chezmoi edit ~/.zshrc` or in `dotfiles/dot_zshrc`, then `chezmoi apply`.
- **Agent config is NOT managed by chezmoi.** `~/.claude/*` and `~/.kos/overrides/*` are owned by `kos library` (see separate spec). `.chezmoiignore` enforces this.
- **First-run prompts live in `.chezmoi.toml.tmpl`.** Adds fields (name/email/github/hostname) to a per-machine `~/.config/chezmoi/chezmoi.toml`. Modify the source template to add/remove prompts.

## Tools

Workspace tools live in `tools/`. Each is a standalone Bun CLI linked to PATH via `bun link`:

- **tmx** — tmux wrapper for agent use
- **transcribe** — transcribe audio files to text via ElevenLabs (`ELEVENLABS_API_KEY` required)

## Repo Layout Gotchas

- **Git root is `~/.kos-kit/`, not `~/.kos-kit/cli/`.** The lockfile (`bun.lock`) lives at repo root. `prek.toml` lives at repo root. Don't put repo-level config inside `cli/`.
- **prek hooks run from repo root.** Biome and tsc entries in `prek.toml` need `cli/` prefixes for paths (e.g., `--config-path cli/biome.json`, `-p cli/tsconfig.json`, file patterns like `cli/.*\\.ts$`).
