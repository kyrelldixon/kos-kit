# Linear CLI Install Setup

**Date:** 2026-04-06
**Status:** Approved

## Context

The old `tools/linear` workspace CLI (a Bun/citty wrapper around Linear's GraphQL API) was removed in commit 88b34ec and replaced by [schpet/linear-cli](https://github.com/schpet/linear-cli) v2.0, installed via Homebrew tap `schpet/tap/linear`.

The replacement left three pieces of drift in the repo:

1. `lib/install-tools.sh` has no manifest entry for linear — fresh `install.sh` runs do not install it at all.
2. `cli/src/commands/auth.ts:13` still invokes `linear auth`, which in v2.0 is a command group. The old CLI's `auth` was the login command; the new CLI's `auth` just prints help. `kos auth` therefore silently no-ops on the linear step.
3. `README.md:88` still lists `tools/linear` in the directory layout, which no longer exists on disk.

The install script advertises `kos auth` as a next step after install, so the manifest gap and the `auth.ts` bug compound: a fresh install silently skips linear, and if the user installs it manually, running the advertised `kos auth` still won't log them in.

## Goals

- Fresh `install.sh --yes` runs on macOS install linear via Homebrew alongside the rest of the Dev tools.
- `kos auth` invokes the correct login command for linear v2.0.
- README directory listing reflects what's actually in `tools/`.

## Non-Goals

- Linux install path for linear. The `schpet/tap` Homebrew tap is macOS-only (source build, no Linux bottle), and kos-kit is currently used on macOS. Adding a speculative Linux branch (via `deno install`, a release binary, etc.) is YAGNI.
- Refactoring `cli/src/commands/auth.ts` beyond the one-line fix.
- Changes to `install.sh:135` Next Steps text — it already reads "gh, linear, claude", which is still correct.

## Design

### 1. `lib/install-tools.sh` — manifest entry + installer

Add one record to `TOOLS_MANIFEST` in the "Dev tools" section, with the `:macos` OS filter so it's hidden from the picker and skipped in `--yes` mode on non-macOS hosts (same mechanism `orb` already uses):

```
"linear:linear:Dev tools:recommended:_install_linear:macos"
```

Add one installer function alongside the other Dev tool installers:

```bash
_install_linear() { brew install schpet/tap/linear; }
```

No Linux branch, no fallback — the `:macos` filter guarantees this function is only called on macOS.

### 2. `cli/src/commands/auth.ts:13` — fix invocation

```ts
// Before
await runAuth("Linear CLI", "linear", ["auth"]);
// After
await runAuth("Linear CLI", "linear", ["auth", "login"]);
```

In linear v2.0, `linear auth` is a command group (`login`, `logout`, `list`, `default`, `token`). `linear auth login` is the actual "add a workspace credential" flow. No other changes to `auth.ts`.

### 3. `README.md:88` — correct the directory listing

```diff
-├── tools/              # CLIs (linear, tmx)
+├── tools/              # CLIs (tmx, transcribe)
```

Reflects current reality: `tools/linear` is gone; `tools/transcribe` was added in 2734630.

## Testing

Manual verification only. No automated tests — this is shell config and a one-line `Bun.spawn` argument tweak with no logic to unit test.

- Run `kos auth` end-to-end on macOS. The linear step should launch the v2.0 login flow (browser OAuth) instead of printing help.
- Confirm `linear` shows in the interactive install picker on macOS with `[installed]` (since it's already on the local machine).
- On a hypothetical Linux host: `install.sh --yes` should not attempt to install linear and should not error.

## Files Changed

- `lib/install-tools.sh` — add manifest entry and `_install_linear` function
- `cli/src/commands/auth.ts` — change `["auth"]` to `["auth", "login"]` on line 13
- `README.md` — update `tools/` directory listing on line 88
