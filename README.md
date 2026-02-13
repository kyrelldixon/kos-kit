# kos-kit

Dev environment kit — tools, dotfiles, and CLI for agentic workflows.

## Bootstrap

One command to set up a fresh machine:

```bash
curl -fsSL https://raw.githubusercontent.com/kyrelldixon/kos-kit/main/bootstrap.sh | bash
```

This will:
1. Install git (if missing)
2. Clone kos-kit to `~/.kos-kit`
3. Launch the interactive installer

Non-interactive (install all defaults, no prompts):

```bash
curl -fsSL https://raw.githubusercontent.com/kyrelldixon/kos-kit/main/bootstrap.sh | bash -s -- --yes
```

> Already have it cloned? Run `bash ~/.kos-kit/install.sh` to re-run the installer.

## What Gets Installed

The installer walks you through 6 tool categories. You choose which ones to install — each category shows exactly what tools it includes.

| Category | Tools | Default |
|----------|-------|---------|
| **Core** | git, zsh, tmux, stow, curl, jq | Always |
| **Terminal** | Ghostty | On |
| **Shell** | starship, eza, bat, fd, ripgrep, fzf, zoxide, direnv, gum, atuin, git-delta, tldr, yq | On |
| **Languages** | bun, fnm (node), go, rust, uv (python) | On |
| **Dev tools** | gh, claude | On |
| **Infrastructure** | tailscale, cloudflared, syncthing | Off |

Core tools are always installed first (they're required). Infrastructure is opt-in.

## Dotfiles

Dotfiles are managed with [GNU Stow](https://www.gnu.org/software/stow/). Stow creates symlinks from `~/.kos-kit/dotfiles/<package>/` into your home directory, so your config files stay version-controlled in the repo but appear where programs expect them.

For example, `dotfiles/zsh/.zshrc` gets symlinked to `~/.zshrc`.

**Packages:**

| Package | What it configures |
|---------|-------------------|
| `zsh` | `.zshrc` — aliases, tool init guards, fnm/starship/zoxide setup |
| `git` | `.gitconfig` — defaults + `[include]` for `~/.gitconfig.local` (personal overrides) |
| `starship` | `.config/starship.toml` — minimal prompt theme |
| `tmux` | `.tmux.conf` — mouse, vi keys, scrollback, true color |
| `ssh` | `.ssh/config` — `Include` for `~/.ssh/config.local` |
| `vim` | `.vimrc` — standard vim config |

**Local overrides:** Git and SSH configs include a `.local` file so you can add machine-specific settings (work email, extra hosts) without modifying the repo.

To re-stow dotfiles after pulling updates:

```bash
cd ~/.kos-kit && stow -R -d dotfiles -t ~ zsh git starship tmux ssh vim
```

## kos CLI

After installation, the `kos` command is available:

```bash
kos doctor      # Check which tools are installed, flag what's missing
kos setup       # Configure name, email, GitHub username
kos auth        # Authenticate gh, linear, claude
kos onboard     # Lessons for agentic workflows
kos cheatsheet  # Print alias and shortcut reference
kos status      # Quick health check (X/Y tools installed)
```

## Project Structure

```
kos-kit/
├── bootstrap.sh        # One-liner entry point (curl | bash)
├── install.sh          # Interactive installer
├── lib/                # Bash modules (detect, utils, install, dotfiles)
├── dotfiles/           # GNU Stow packages (zsh, git, tmux, etc.)
├── tools/              # CLIs (linear, tmx)
├── cli/                # kos meta-CLI (Bun + citty)
├── lessons/            # Onboard lessons
└── package.json        # Bun workspaces
```

## License

MIT
