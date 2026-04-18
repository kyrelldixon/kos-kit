# kos-kit

Dev environment kit — tools, dotfiles, and CLI for agentic workflows.

## Install

One command on a fresh machine:

```bash
curl -fsSL https://raw.githubusercontent.com/kyrelldixon/kos-kit/main/install.sh | bash
```

This installs prerequisites (`mise`, `chezmoi`, `bun`, `gum`), clones kos-kit to `~/.kos-kit`, and runs `kos setup`.

Non-interactive (install defaults, no prompts):

```bash
curl -fsSL https://raw.githubusercontent.com/kyrelldixon/kos-kit/main/install.sh | bash -s -- --yes
```

> Already have it cloned? Run `kos setup` to re-run the install/update flow.

## What Gets Installed

Four layers, each declarative:

| Layer | File | What |
|---|---|---|
| Lang/CLI tools | `mise.toml` (+ `mise.lock`) | bun, node, go, rust, uv, plus CLIs: starship, eza, bat, fd, ripgrep, fzf, zoxide, direnv, delta, yq, atuin, gh, just, prek |
| System/GUI tools | `kit.toml` | git, zsh, tmux, jq, gum, tldr, Ghostty, OrbStack, Claude Code, varlock, 1Password CLI, (opt-in) tailscale/cloudflared/syncthing, fun stuff |
| Dotfiles | `dotfiles/` (chezmoi source state) | zsh, git, tmux, vim, starship, ssh configs |
| Agent config | (separate — `kos library` spec) | ~/.claude/, skills, hooks, settings |

All default tools are installed unless you pass `--yes` on a fresh machine (infrastructure is opt-in either way).

## kos CLI

After install, the `kos` command is available:

```bash
kos setup       # Install/update path (replaces old `bootstrap` + `update`)
kos doctor      # Check all tools; report missing + duplicate (brew/mise) tools
kos dotfiles    # apply / edit / status / diff via chezmoi
kos auth        # Authenticate gh, linear, claude
kos capture     # Slack capture helpers
kos config      # kos config get/set/list
kos jobs        # Scheduled job management
kos status      # Quick health summary
kos onboard     # Lessons for agentic workflows
kos cheatsheet  # Print alias/shortcut reference
kos update      # (deprecated) shim for `kos setup`
```

## Dotfiles

Dotfiles live in `dotfiles/` as [chezmoi](https://www.chezmoi.io/) source state. Filenames use chezmoi conventions (`dot_zshrc` → `~/.zshrc`, `.tmpl` suffix for templated files).

Editing dotfiles:

```bash
chezmoi edit ~/.zshrc          # opens source file, applies on save
kos dotfiles edit ~/.zshrc     # same, via kos wrapper
# or edit source directly:
$EDITOR ~/.kos-kit/dotfiles/dot_zshrc && chezmoi apply
```

**Escape hatches** for machine-specific values:
- `~/.gitconfig.local` — included by `dot_gitconfig.tmpl` (signing keys, work-only settings)
- `~/.ssh/config.local` — included by `dot_ssh/config` (Tailscale peers, work bastions)

## Upgrading from v1 (stow) to v2 (chezmoi)

Just run `kos setup`. It detects your v1 setup, backs up current state to `~/.kos-backup/pre-v2/`, unlinks stow symlinks, and applies v2 via chezmoi.

Editing dotfiles has changed: with v1 you could edit `~/.zshrc` directly (symlink). With v2, the deployed file is a real copy — edit the source via `chezmoi edit ~/.zshrc` or edit `~/.kos-kit/dotfiles/dot_zshrc` directly, then `chezmoi apply`.

## Project Structure

```
kos-kit/
├── install.sh          # Prereq installer (curl | bash)
├── mise.toml           # Language/CLI tool manifest
├── mise.lock           # Pinned versions
├── kit.toml            # Non-mise tool manifest
├── dotfiles/           # Chezmoi source state
├── cli/                # kos CLI (Bun + citty)
├── tools/              # Workspace tools (tmx, transcribe, library)
├── lessons/            # Onboard lessons
└── docs/superpowers/   # Specs + plans
```

## License

MIT
