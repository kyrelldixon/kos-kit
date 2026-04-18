# kos-kit v2 Design Spec

Restructure kos-kit around clean, declarative layers: mise for language/CLI tools, a small `kit.toml` for everything mise can't handle, chezmoi for dotfiles, and the existing `kos` CLI as the daily driver. Ports bash installer logic into TypeScript. Replaces stow.

## Problem

The current repo mixes five concerns behind one bash installer:

1. Machine bootstrap (`install.sh` + `lib/*.sh`, ~20k of bash)
2. Dotfile sync (stow, `dotfiles/<package>/` layout)
3. Agentic `kos` CLI (daily driver)
4. Workspace tools (`tools/tmx`, `tools/transcribe`)
5. Teaching material (`lessons/`)

Three frictions show up in practice:

- **Dotfile handling** — stow's conflict/backup model and separate `.local` overlay files feel clunky. Per-machine values (name/email, hostnames) require split files.
- **Adding a tool is a chore** — new tool means editing `TOOLS_MANIFEST` in bash, adding an install function, verifying doctor behavior, updating the README. Multiple edit sites.
- **Sharing / setup on other machines** — the flow isn't simple enough for the repo's actual audience (public, with real users). Bootstrap duration, interactivity, and tool drift across machines all compound.

## Solution

Split the install surface into four declarative layers with a single source of truth each. Port installer orchestration into the `kos` CLI (TypeScript). Replace stow with chezmoi. One command — `kos setup` — handles fresh installs and updates.

A fifth layer (Claude agent config via `kos library`) has its own spec ([2026-03-18-kos-library-design.md](../../../projects/kyrell-os/docs/superpowers/specs/2026-03-18-kos-library-design.md)). This spec reserves territory for it but does not implement it.

## Architecture

Four layers, each with one source of truth:

| Layer | Engine (ships in kos-kit) | Content (user-owned) | Target |
|---|---|---|---|
| Lang/CLI tools | `mise` | `mise.toml` + `mise.lock` | mise-managed installs |
| System/GUI tools | kos CLI reading `kit.toml` | `kit.toml` | brew/apt/custom installers |
| Dotfiles | `chezmoi` | `dotfiles/` (chezmoi source state) | `$HOME/*` (excl. `~/.claude`, `~/.kos/overrides`) |
| Agent config (deferred) | `kos library` CLI | `library.json` in user's catalog repo | `~/.claude/*`, `~/.kos/overrides/*` |

Layer boundaries are strict: chezmoi never touches `~/.claude/*`; `kos library` never touches traditional dotfiles. `.chezmoiignore` enforces the split on chezmoi's side.

## Repo Layout

### Before

```
kos-kit/
├── bootstrap.sh              # curl entry
├── install.sh                # 140 lines bash installer
├── lib/                      # bash modules
│   ├── detect.sh
│   ├── utils.sh
│   ├── install-tools.sh      # TOOLS_MANIFEST + installer fns
│   └── dotfiles.sh           # stow wrapper + git identity
├── dotfiles/                 # stow packages
│   ├── zsh/.zshrc
│   ├── git/.gitconfig
│   ├── starship/.config/starship.toml
│   ├── tmux/.tmux.conf
│   ├── ssh/.ssh/config
│   └── vim/.vimrc
├── cli/                      # kos workspace
├── tools/{tmx,transcribe}/
├── lessons/
├── docs/superpowers/
├── prek.toml
└── bun.lock
```

### After

```
kos-kit/
├── install.sh                # ~30 lines — prereq installer, hands off to kos setup
├── mise.toml                 # pinned mise tools
├── mise.lock                 # committed, exact versions + checksums
├── kit.toml                  # non-mise tools (brew, casks, custom installers)
├── dotfiles/                 # chezmoi source state
│   ├── .chezmoi.toml.tmpl    # init prompts (name/email/github)
│   ├── .chezmoiignore        # excludes ~/.claude, ~/.kos/overrides
│   ├── dot_zshrc
│   ├── dot_gitconfig.tmpl
│   ├── dot_tmux.conf
│   ├── dot_vimrc
│   ├── dot_config/starship.toml
│   └── dot_ssh/config        # static; .local kept as escape hatch
├── cli/
│   ├── src/commands/
│   │   ├── setup.ts          # replaces bootstrap + update
│   │   ├── update.ts         # deprecation shim — one release
│   │   ├── doctor.ts         # reads mise.toml + kit.toml
│   │   ├── dotfiles.ts       # chezmoi wrappers
│   │   └── ...existing
│   └── src/lib/
│       ├── manifest.ts       # parses mise.toml + kit.toml
│       └── migrate.ts        # v1 → v2 stow symlink detection
├── tools/
│   ├── tmx/                  # unchanged
│   ├── transcribe/           # unchanged
│   └── library/              # reserved; separate spec
├── lessons/                  # unchanged
├── docs/superpowers/
├── prek.toml
├── bun.lock
└── package.json
```

### Deleted

- `bootstrap.sh` — folded into `install.sh`
- `lib/*.sh` — logic moves to `cli/src/commands/setup.ts` + `cli/src/lib/manifest.ts`

### Kept as bash

Only `install.sh` — it installs the prerequisites needed to run `kos`, so it cannot depend on `kos`.

## Tool Manifest

### `mise.toml` (pinned)

```toml
[tools]
# Languages / runtimes
bun  = "1.3.12"
node = "24"          # LTS "Krypton" — pin major so LTS patches flow in
go   = "1.26.2"
rust = "1.95.0"
uv   = "0.11.7"

# Shell goodies
starship = "1.24.2"
bat      = "0.26.1"
fd       = "10.4.2"
ripgrep  = "15.1.0"
fzf      = "0.71.0"
zoxide   = "0.9.9"
direnv   = "2.37.1"
delta    = "0.19.2"
yq       = "4.53.2"
atuin    = "18.15.2"

# Dev CLIs
gh   = "2.90.0"
just = "1.49.0"
prek = "0.3.9"

# eza — override backend; default cargo backend compiles from source on macOS
[tools.eza]
version = "0.23.4"
backend = "ubi:eza-community/eza"
```

Commit `mise.lock` alongside for exact-checksum reproducibility. Upgrade: `mise up <tool>` → commit updated `mise.toml` + `mise.lock`.

### `kit.toml` schema

```toml
version = 1

[[tools]]
name      = "string"          # canonical id (required)
display   = "string"          # optional pretty label; defaults to name
category  = "core|terminal|shell|dev|apps|infrastructure"
default   = true              # installed in --yes mode
check     = "string"          # optional override; defaults to `command -v <name>`
depends   = ["tool-name"]     # optional install-order hint

# At least one OS spec required; OS omitted = not installed on that OS.
[tools.macos]
kind      = "brew|cask|custom"
pkg       = "string"          # brew/cask only
install   = "string"          # custom only — shell command
uninstall = "string"          # optional

[tools.linux]
kind      = "apt|custom"
pkg       = "string"
install   = "string"
uninstall = "string"
```

### `kit.toml` contents

```toml
version = 1

# --- Core (always installed) ---
[[tools]]
name = "git"
category = "core"
default = true
[tools.macos] ; kind = "brew"; pkg = "git"
[tools.linux] ; kind = "apt"; pkg = "git"

[[tools]]
name = "zsh"
category = "core"
default = true
[tools.macos] ; kind = "brew"; pkg = "zsh"
[tools.linux] ; kind = "apt"; pkg = "zsh"

[[tools]]
name = "tmux"
category = "core"
default = true
[tools.macos] ; kind = "brew"; pkg = "tmux"
[tools.linux] ; kind = "apt"; pkg = "tmux"

[[tools]]
name = "jq"
category = "core"
default = true
[tools.macos] ; kind = "brew"; pkg = "jq"
[tools.linux] ; kind = "apt"; pkg = "jq"

[[tools]]
name = "gum"
category = "core"
default = true
[tools.macos] ; kind = "brew"; pkg = "gum"
[tools.linux] ; kind = "custom"; install = "<charm apt repo install>"

# --- Shell (tldr via brew because not in mise registry) ---
[[tools]]
name = "tldr"
display = "tldr (tealdeer)"
category = "shell"
default = true
check = "tldr --version"
[tools.macos] ; kind = "brew"; pkg = "tealdeer"
[tools.linux] ; kind = "custom"; install = "cargo install tealdeer"

# --- Terminal ---
[[tools]]
name = "ghostty"
display = "Ghostty"
category = "terminal"
default = true
[tools.macos] ; kind = "cask"; pkg = "ghostty"

# --- Dev ---
[[tools]]
name = "claude"
display = "Claude Code"
category = "dev"
default = true
check = "claude --version"
[tools.macos] ; kind = "custom"; install = "curl -fsSL https://claude.ai/install.sh | bash"
[tools.linux] ; kind = "custom"; install = "curl -fsSL https://claude.ai/install.sh | bash"

[[tools]]
name = "varlock"
category = "dev"
default = true
check = "varlock --version"
[tools.macos] ; kind = "custom"; install = "bun add -g varlock"
[tools.linux] ; kind = "custom"; install = "bun add -g varlock"

[[tools]]
name = "1password-cli"
display = "1Password CLI"
category = "dev"
default = true
check = "op --version"
[tools.macos] ; kind = "cask"; pkg = "1password-cli"
[tools.linux] ; kind = "custom"; install = "<1password apt/rpm install>"

[[tools]]
name = "orbstack"
display = "OrbStack"
category = "dev"
default = true
[tools.macos] ; kind = "cask"; pkg = "orbstack"

# --- Infrastructure (opt-in) ---
[[tools]]
name = "tailscale"
category = "infrastructure"
default = false
[tools.macos] ; kind = "cask"; pkg = "tailscale"
[tools.linux] ; kind = "apt"; pkg = "tailscale"

[[tools]]
name = "cloudflared"
category = "infrastructure"
default = false
[tools.macos] ; kind = "brew"; pkg = "cloudflared"
[tools.linux] ; kind = "apt"; pkg = "cloudflared"

[[tools]]
name = "syncthing"
category = "infrastructure"
default = false
[tools.macos] ; kind = "brew"; pkg = "syncthing"
[tools.linux] ; kind = "brew"; pkg = "syncthing"
```

(Inline-table syntax above is shorthand for readability. Real file uses full `[tools.macos]` sections.)

### Split rule

If mise's default registry has it, use `mise.toml`. Otherwise `kit.toml`. This keeps the split unambiguous — no per-tool judgment calls every time a new tool is added.

### Shared consumer

`cli/src/lib/manifest.ts` parses both files. Exports:

```ts
type MiseEntry = { name: string; version: string };
type KitEntry = {
  name: string;
  display: string;
  category: Category;
  default: boolean;
  check: string;
  spec: OsSpec | undefined;
};

export function loadMise(): MiseEntry[];
export function loadKit(os: "darwin" | "linux"): KitEntry[];
export function checkInstalled(entry: KitEntry | MiseEntry): Promise<boolean>;
```

Used by `kos setup` (install orchestration) and `kos doctor` (drift report). Shared parser = no duplicated manifest schemas.

## Dotfiles via chezmoi

### Current → chezmoi mapping

| Current (stow) | Chezmoi source |
|---|---|
| `dotfiles/zsh/.zshrc` | `dotfiles/dot_zshrc` |
| `dotfiles/git/.gitconfig` + `~/.gitconfig.local` | `dotfiles/dot_gitconfig.tmpl` (`.local` kept as escape hatch) |
| `dotfiles/starship/.config/starship.toml` | `dotfiles/dot_config/starship.toml` |
| `dotfiles/tmux/.tmux.conf` | `dotfiles/dot_tmux.conf` |
| `dotfiles/ssh/.ssh/config` + `~/.ssh/config.local` | `dotfiles/dot_ssh/config` (`.local` kept as escape hatch) |
| `dotfiles/vim/.vimrc` | `dotfiles/dot_vimrc` |

Conventions: `dot_` prefix → leading `.` in target. `.tmpl` suffix → processed as Go template on apply.

### `dotfiles/.chezmoi.toml.tmpl` (init prompts)

```toml
{{- $name := promptStringOnce . "name" "Full name" -}}
{{- $email := promptStringOnce . "email" "Git email" -}}
{{- $github := promptStringOnce . "github" "GitHub username" -}}

[data]
    name = {{ $name | quote }}
    email = {{ $email | quote }}
    github = {{ $github | quote }}
    hostname = {{ .chezmoi.hostname | quote }}
```

### `dotfiles/dot_gitconfig.tmpl` (primary templating example)

```
[user]
    name = {{ .name }}
    email = {{ .email }}

[include]
    path = ~/.gitconfig.local    # escape hatch for one-off overrides
```

Kills the requirement for `~/.gitconfig.local` to carry identity. Users who want SSH signing or one-off overrides still put them in `.gitconfig.local`.

### `dotfiles/.chezmoiignore`

```
# Agent config is managed by `kos library`, not chezmoi
.claude
.claude/**
.kos/overrides
.kos/overrides/**
```

### Ergonomic gotcha (README callout)

With stow, `~/.zshrc` was a symlink — editing the deployed file edited the repo file. With chezmoi, the deployed file is a real copy. Edit flows:

```bash
chezmoi edit ~/.zshrc         # opens source, applies on save
kos dotfiles edit ~/.zshrc    # same, via kos wrapper
# or edit source directly:
$EDITOR ~/.kos-kit/dotfiles/dot_zshrc && chezmoi apply
```

## `install.sh` + `kos setup` Flow

### Entry: `install.sh` (~30 lines)

```bash
#!/usr/bin/env bash
set -euo pipefail

os="$(uname)"

install_prereqs_macos() {
    if ! command -v brew >/dev/null; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew install mise chezmoi bun gum
}

install_prereqs_linux() {
    command -v mise    >/dev/null || curl -fsSL https://mise.run       | sh
    command -v chezmoi >/dev/null || sh -c "$(curl -fsLS get.chezmoi.io)"
    command -v bun     >/dev/null || curl -fsSL https://bun.sh/install | bash
    command -v gum     >/dev/null || _install_gum_linux_or_die
}

case "$os" in
    Darwin) install_prereqs_macos ;;
    Linux)  install_prereqs_linux ;;
    *)      echo "Unsupported OS: $os"; exit 1 ;;
esac

: "${KOS_DIR:=$HOME/.kos-kit}"
[ -d "$KOS_DIR" ] || git clone https://github.com/kyrelldixon/kos-kit.git "$KOS_DIR"
cd "$KOS_DIR"
bun install
bun link ./cli

exec kos setup "$@"
```

brew is macOS-only. Linux uses each tool's official installer.

### `kos setup` (TS)

Idempotent. Same command for fresh install, update, or re-run:

```
parse flags (--yes)
│
├── detectV1State()                  # if stow symlinks present → migration flow
│
├── git pull --ff-only               # skip if not fast-forward-able; warn
├── mise install                     # reads mise.toml + mise.lock
├── kit.toml install                 # picker in default mode; defaults in --yes
├── chezmoi init --source $KOS_DIR/dotfiles --apply
├── bun link workspace tools         # tmx, transcribe, library (if present)
├── kos library config sync          # best-effort; skips if no catalog
└── print next steps (kos doctor, kos auth)
```

All steps idempotent:

- `mise install` skips already-installed versions
- `kit.toml` installer runs each entry's `check`; skips if exit 0
- `chezmoi apply` only writes changed files
- `bun link` overwrites to the same target
- `kos library config sync` designed idempotent

### Interactive picker

Preserved from v1. Applies only to `kit.toml` entries where `category ∈ {apps, infrastructure}` AND `default = false`. mise tools are always installed unconditionally — they're load-bearing, not opt-in.

Picker becomes shorter and more meaningful: "Do you want tailscale?" is a real question; "Do you want bun?" isn't.

## Migration from v1

### Detection

`kos setup` checks for stow state at start. If `$HOME` contains symlinks whose target paths include `$KOS_DIR/dotfiles/`, v1 is detected.

### Flow

```
detect v1 → prompt "Unlink N stow symlinks and migrate?" (--yes skips)
          → mkdir -p ~/.kos-backup/pre-v2/
          → for each symlink:
                cp -L "$symlink" ~/.kos-backup/pre-v2/<name>
                unlink "$symlink"
          → continue normal setup flow
```

Chezmoi takes over cleanly once symlinks are gone.

### User experience

```
$ git pull
$ kos setup

Detected kos-kit v1 setup (6 stow-managed symlinks).
Migrate to v2? (y/N) y

Backing up to ~/.kos-backup/pre-v2/ ... done
Unlinking stow symlinks ............... done
Installing mise prerequisites ......... done
Running mise install (22 tools) ....... done
Installing kit.toml tools ............. done
Applying dotfiles via chezmoi ......... done
Linking workspace tools ............... done
Agent config .......................... skipped (no catalog configured)

Run `kos doctor` to see duplicate brew/mise tools and cleanup suggestions.
```

### Deprecation shim — `kos update`

Ships in v2, prints deprecation warning, calls `kos setup`. Removed in a subsequent release once real-user telemetry (anecdotal; this project has no metrics) suggests users have migrated.

### Duplicate tools

v1 users have brew-installed tools (gh, ripgrep, fd, etc.) that now overlap with `mise.toml` entries. Both get installed; mise's shim PATH wins at call time.

`kos doctor` surfaces the duplicates with a copy-paste cleanup suggestion:

```
Duplicates found (mise + brew):
  gh        brew: 2.85.0      mise: 2.90.0 [active]
  ripgrep   brew: 14.1.0      mise: 15.1.0 [active]

Remove brew versions with:
  brew uninstall gh ripgrep
```

No automatic uninstall — user-controlled.

### README

Short **Upgrading** section:

```
Upgrading from v1 (stow) to v2 (chezmoi)
----------------------------------------
Just run `kos setup`. It detects your v1 setup, backs up current state to
~/.kos-backup/pre-v2/, unlinks stow symlinks, and applies v2 via chezmoi.

Editing dotfiles has changed: with v1 you could edit ~/.zshrc directly
(symlink). With v2, edit the source via `chezmoi edit ~/.zshrc` or edit
~/.kos-kit/dotfiles/dot_zshrc directly, then `chezmoi apply`.
```

## CLI Surface (post-migration)

| Command | Status | Purpose |
|---|---|---|
| `kos setup` | new | Full install/update path (replaces `kos update` + old `kos setup`) |
| `kos update` | deprecation shim | Warns, calls `kos setup`. Removed next release. |
| `kos dotfiles apply` | new | `chezmoi apply` wrapper |
| `kos dotfiles edit <target>` | new | `chezmoi edit` wrapper |
| `kos dotfiles status` | new | `chezmoi status` wrapper |
| `kos dotfiles diff` | new | `chezmoi diff` wrapper |
| `kos doctor` | updated | Reads both manifests; reports installed/missing/duplicate + chezmoi drift |

Unchanged: `kos capture`, `kos config`, `kos auth`, `kos status`, `kos onboard`, `kos cheatsheet`.

## Testing

Local-only. No GitHub Actions. prek hooks continue to handle commit-time linting/formatting.

**Unit tests** (`bun test`):

- `cli/src/lib/manifest.test.ts` — parses both manifests, rejects invalid entries (missing `kind`, unknown category, version-string issues)
- `cli/src/lib/migrate.test.ts` — `findStowSymlinks` against tmpdir fixture; asserts correct detection + zero false positives on non-stow symlinks
- `cli/src/commands/doctor.test.ts` — faked manifest + faked `command -v`; asserts installed/missing/duplicate classification

**Integration test** (one):

- `cli/src/commands/setup.integration.test.ts` — `kos setup --dry-run` against temp kos-kit clone; asserts planned-steps order and no real installs

**End-to-end**: manual — run the full installer on a fresh VM or spare machine before each release.

## Out of Scope / Deferred

- `tools/library/` — Claude agent config layer, its own spec ([2026-03-18-kos-library-design.md](../../../projects/kyrell-os/docs/superpowers/specs/2026-03-18-kos-library-design.md))
- `kos setup --rollback-v1` — backup dir is enough recovery surface
- Auto-prune duplicate brew packages — `kos doctor` advisory only
- Non-Debian Linux (Fedora, Arch, …) — bootstrap errors with clear manual instructions; fuller support lands when needed
- Ghostty/OrbStack Linux alternatives — `kit.toml` entries omit Linux; users pick their own
- `lessons/` restructure or interactivity — keep as-is
- GitHub Actions / CI — local prek hooks remain the quality gate

## Dependencies

### System-level (added)

- `mise` — language/CLI tool manager (installed by `install.sh`)
- `chezmoi` — dotfile manager (installed by `install.sh`)

### System-level (removed)

- `stow` — no longer used; `kit.toml` drops the "core" entry for it

### Project (added)

- `smol-toml` — zero-dep TOML parser for `cli/src/lib/manifest.ts`

### Project (removed)

- All logic in `lib/*.sh` — migrated to TypeScript in `cli/src/`

## Implementation-phase unknowns

Items left as placeholders in this spec; resolved during the plan/implementation phase rather than the design phase:

- `gum` Linux install command (Charm's apt repo, or fallback to GitHub releases binary)
- `1password-cli` Linux install command (1Password's apt/rpm repo)
- `_install_gum_linux_or_die` stub in `install.sh` — concrete branching for Debian/Ubuntu vs. fallback error message

These are concrete commands, not architectural decisions. Splitting them out keeps the design clean; the plan will resolve each.

## Tech Stack

- **Runtime**: Bun (for `kos` CLI and workspace tools)
- **CLI framework**: citty (existing)
- **TOML parsing**: smol-toml (small, zero-dep)
- **Linting/formatting**: Biome (existing)
- **Testing**: Bun test (existing)
- **Pre-commit**: prek (existing)
