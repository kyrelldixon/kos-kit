# Linear CLI Install Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the new schpet/linear-cli v2.0 into the kos-kit install script, fix the `kos auth` command to use the correct login subcommand, and remove stale references to the removed `tools/linear` workspace.

**Architecture:** Three small, independent edits to existing files — a manifest entry + installer function in the install script's tool registry (`lib/install-tools.sh`), a one-line change to the `Bun.spawn` args in `cli/src/commands/auth.ts`, and a directory listing fix in `README.md`. No new files, no new abstractions, no tests (shell config + one-line CLI arg tweak — manual verification only, as agreed in the spec).

**Tech Stack:** Bash (install script), Bun + TypeScript + citty (kos CLI), Homebrew tap `schpet/tap/linear`.

**Spec:** [`docs/superpowers/specs/2026-04-06-linear-cli-install-setup-design.md`](../specs/2026-04-06-linear-cli-install-setup-design.md)

---

## File Structure

All changes are modifications to existing files. No files are created.

| File | Role | Change |
|------|------|--------|
| `lib/install-tools.sh` | Tool manifest + installer registry | Add `linear` manifest entry in "Dev tools" section + `_install_linear` function |
| `cli/src/commands/auth.ts` | `kos auth` subcommand implementation | Change the linear invocation args from `["auth"]` to `["auth", "login"]` |
| `README.md` | Repo overview and project structure | Fix the `tools/` directory listing (linear is gone, transcribe was added) |

Each file is edited once and committed independently so that if one change needs to be reverted it can be reverted cleanly.

---

## Task 1: Add linear to install-tools.sh manifest and installer

**Files:**
- Modify: `lib/install-tools.sh:85` (add manifest entry after yt-dlp)
- Modify: `lib/install-tools.sh:307` (add `_install_linear` function after `_install_yt_dlp`)

- [ ] **Step 1: Read the surrounding context to confirm line numbers**

Run: verify the "Dev tools" block in the manifest still ends at `yt-dlp` on line 85 and that `_install_yt_dlp` is the last Dev tool installer function (ends near line 307, before `# --- App installers ---`).

Expected: the manifest's "Dev tools" section matches the snippet below. If line numbers have drifted since the plan was written, adjust but keep the linear entry as the **last** line of the "Dev tools" block, before the blank line separator and the `# Apps` comment.

```bash
  # Dev tools
  "gh:gh:Dev tools:recommended:_install_gh"
  "claude:claude:Dev tools:recommended:_install_claude"
  "agent-browser:agent-browser:Dev tools:recommended:_install_agent_browser"
  "prek:prek:Dev tools:recommended:_install_prek"
  "op:1Password CLI:Dev tools:recommended:_install_op"
  "just:just:Dev tools:recommended:_install_just"
  "inngest:inngest:Dev tools:recommended:_install_inngest"
  "varlock:varlock:Dev tools:recommended:_install_varlock"
  "yt-dlp:yt-dlp:Dev tools:recommended:_install_yt_dlp"
```

- [ ] **Step 2: Add the `linear` manifest entry**

In `lib/install-tools.sh`, edit the "Dev tools" block in `TOOLS_MANIFEST` so it ends like this (new line at the bottom):

```bash
  # Dev tools
  "gh:gh:Dev tools:recommended:_install_gh"
  "claude:claude:Dev tools:recommended:_install_claude"
  "agent-browser:agent-browser:Dev tools:recommended:_install_agent_browser"
  "prek:prek:Dev tools:recommended:_install_prek"
  "op:1Password CLI:Dev tools:recommended:_install_op"
  "just:just:Dev tools:recommended:_install_just"
  "inngest:inngest:Dev tools:recommended:_install_inngest"
  "varlock:varlock:Dev tools:recommended:_install_varlock"
  "yt-dlp:yt-dlp:Dev tools:recommended:_install_yt_dlp"
  "linear:linear:Dev tools:recommended:_install_linear:macos"
```

The trailing `:macos` is the OS filter — it ensures the tool is skipped on non-macOS hosts (same mechanism `orb` uses in the "Apps" section). Without this filter, Linux `install.sh --yes` runs would call `brew install schpet/tap/linear` and fail.

- [ ] **Step 3: Add the `_install_linear` installer function**

In `lib/install-tools.sh`, add the function right after `_install_yt_dlp` (which ends around line 307) and before `_install_agent_browser`. The result should look like:

```bash
_install_yt_dlp() {
  case "$KOS_OS" in
    macos) brew install yt-dlp ;;
    *)
      if has uv; then
        uv tool install yt-dlp
      elif has pip; then
        pip install yt-dlp
      else
        warn "Need brew, uv, or pip to install yt-dlp"
        return 1
      fi
      ;;
  esac
}

_install_linear() { brew install schpet/tap/linear; }

_install_agent_browser() {
```

No `case "$KOS_OS"` switch — the `:macos` filter on the manifest entry means this function is only ever called on macOS, so branching would be dead code.

- [ ] **Step 4: Lint the shell file**

Run: `shellcheck lib/install-tools.sh` (if `shellcheck` is installed on your machine — it's recommended but not critical).

Expected: no new warnings. If shellcheck isn't available, skip this step — prek's hooks don't cover `lib/*.sh`.

- [ ] **Step 5: Dry-run the manifest parsing**

Run:

```bash
bash -c 'source lib/utils.sh; source lib/detect.sh; source lib/install-tools.sh; for r in "${TOOLS_MANIFEST[@]}"; do echo "$r"; done | grep linear'
```

Expected output:
```
linear:linear:Dev tools:recommended:_install_linear:macos
```

This confirms the manifest loads without a syntax error and that the entry is present.

- [ ] **Step 6: Verify `_install_linear` is defined**

Run:

```bash
bash -c 'source lib/utils.sh; source lib/detect.sh; source lib/install-tools.sh; declare -f _install_linear'
```

Expected output (function body):
```
_install_linear ()
{
    brew install schpet/tap/linear
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/install-tools.sh
git commit -m "feat(install): add linear CLI to tool manifest

Installs schpet/tap/linear on macOS via Homebrew. The :macos filter
ensures Linux installs skip it, since the tap has no Linux bottle."
```

---

## Task 2: Fix `kos auth` to use `linear auth login`

**Files:**
- Modify: `cli/src/commands/auth.ts:13`

- [ ] **Step 1: Confirm the current invocation**

Read `cli/src/commands/auth.ts` lines 1–20. Line 13 must currently read:

```ts
    await runAuth("Linear CLI", "linear", ["auth"]);
```

If it already reads `["auth", "login"]`, skip this task — the work is already done.

- [ ] **Step 2: Change the args array**

Edit `cli/src/commands/auth.ts:13` so it reads:

```ts
    await runAuth("Linear CLI", "linear", ["auth", "login"]);
```

No other changes to this file. The `runAuth` helper, the `gh auth login` and `claude login` lines, and the imports all stay exactly as they are.

- [ ] **Step 3: Typecheck the CLI**

Run:

```bash
(cd cli && bunx tsc --noEmit -p tsconfig.json)
```

Expected: exits 0 with no output (or `tsc` prints nothing). If it errors, it's unrelated to this single-line string change — stop and investigate. Note: `bun run --cwd` does not accept a `--cwd` positional the way `npm run --prefix` does; use a subshell `(cd ... && ...)` or rely on the prek pre-commit TypeScript hook (which runs automatically on commit via `prek.toml`) to catch type errors.

- [ ] **Step 4: Confirm biome is clean on the modified file**

Run:

```bash
bunx biome check --config-path cli/biome.json cli/src/commands/auth.ts
```

Expected: "Checked 1 file" with no diagnostics.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/auth.ts
git commit -m "fix(cli): use 'linear auth login' instead of 'linear auth'

In schpet/linear-cli v2.0 'auth' is a command group. The actual login
flow is 'auth login'; bare 'auth' just prints help, so 'kos auth'
was silently no-opping on the linear step."
```

---

## Task 3: Update README.md directory listing

**Files:**
- Modify: `README.md:88`

- [ ] **Step 1: Confirm the current line**

Read `README.md` lines 80–92. Line 88 must currently read:

```
├── tools/              # CLIs (linear, tmx)
```

- [ ] **Step 2: Replace the line**

Edit `README.md:88` so it reads:

```
├── tools/              # CLIs (tmx, transcribe)
```

The ordering (tmx first, transcribe second) reflects the order they were added to the repo and the order they appear in `install.sh`'s CLI linking block.

- [ ] **Step 3: Verify no other stale references**

Run:

```bash
grep -rn "tools/linear\|tools\\\\linear" README.md
```

Expected: no output. If any matches come back, they're additional drift that should be fixed in this same commit.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): update tools/ listing after linear/transcribe changes

tools/linear was removed in 88b34ec; tools/transcribe was added
in 2734630. The project structure listing was stale."
```

---

## Task 4: End-to-end verification

**Files:** none (verification only, no commit)

- [ ] **Step 1: Confirm all three commits are on the branch**

Run:

```bash
git log --oneline -5
```

Expected: the three new commits (manifest, auth.ts, README) are visible on top of the spec commit `b3b8f88` and the earlier `07773c2 feat(prek): setup prek`.

- [ ] **Step 2: Confirm linear shows in the tool manifest dry-run**

Run:

```bash
bash -c 'source lib/utils.sh; source lib/detect.sh; source lib/install-tools.sh; for r in "${TOOLS_MANIFEST[@]}"; do IFS=: read -r cmd disp cat cls fn os <<< "$r"; if [[ "$cmd" == "linear" ]]; then echo "manifest: cmd=$cmd cat=$cat fn=$fn os=$os"; fi; done; echo "fn defined: $(declare -f _install_linear | wc -l) lines"'
```

Expected output:
```
manifest: cmd=linear cat=Dev tools fn=_install_linear os=macos
fn defined:        4 lines
```

(The exact line count from `declare -f` may differ slightly — what matters is that it's nonzero, proving the function is defined.)

- [ ] **Step 3: Run `kos auth` manually and confirm the linear step triggers the login flow**

Run:

```bash
kos auth
```

When the installer reaches the "Linear CLI" step, expected behavior:
- `linear` command is found (it's already installed on this machine at `/opt/homebrew/bin/linear`)
- The command that runs is `linear auth login` (a browser-based OAuth flow or a "which workspace?" prompt), **not** linear's help text

If linear prints its help output instead of a login flow, Task 2 was not applied correctly — re-check `cli/src/commands/auth.ts:13`.

You can bail out of the linear login at the prompt if you're already authenticated — the goal of this step is just to confirm it reaches the login UI, not to actually re-authenticate.

- [ ] **Step 4: Confirm README renders correctly**

Read `README.md:80-92`. The directory structure block should list `tools/ # CLIs (tmx, transcribe)` on line 88 with no stale `linear` reference anywhere in the file.

- [ ] **Step 5: Final `git status` check**

Run:

```bash
git status
```

Expected: working tree clean (no unstaged changes introduced by this work). If there are unstaged changes, they are unrelated drift and should be handled separately, not folded into the linear work.

---

## Out of Scope (do not add to this plan)

- Linux install path for `schpet/linear-cli` (YAGNI — the `:macos` filter handles this).
- Refactoring `cli/src/commands/auth.ts` beyond the one-line args change.
- Adding unit tests for `auth.ts` — it's a thin `Bun.spawn` wrapper with no logic to cover.
- Updating `install.sh:135` "Next steps" text — it already reads `kos auth — authenticate gh, linear, claude`, which is correct.
- Removing the `tools/linear` archived directory (it was already archived to `~/projects/archived/linear-cli/` in commit 88b34ec — no leftover state in this repo).
