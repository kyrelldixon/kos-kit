# kos-kit

Dev environment kit — tools, dotfiles, and CLI for agentic workflows.

## Bootstrap

One command to set up a fresh machine:

```bash
curl -fsSL https://raw.githubusercontent.com/kyrelldixon/kos-kit/main/bootstrap.sh | bash
```

Non-interactive (install all defaults, no prompts):

```bash
curl -fsSL https://raw.githubusercontent.com/kyrelldixon/kos-kit/main/bootstrap.sh | bash -s -- --yes
```

> Already have it cloned? Run `bash ~/.kos-kit/install.sh` to re-run the installer.

## What It Does

1. **Installs tools** across 6 categories (interactive selection via gum)
2. **Manages dotfiles** via GNU Stow (zsh, git, starship, tmux, ssh, vim)
3. **Provides CLIs** — `linear`, `tmx`, and the `kos` meta-CLI

## Tool Categories

| Category | Tools | Default |
|----------|-------|---------|
| Core | git, zsh, tmux, stow, curl, jq | Always |
| Terminal | Ghostty | On |
| Shell | starship, eza, bat, fd, ripgrep, fzf, zoxide, direnv, gum, atuin, git-delta, tldr, yq | On |
| Languages | fnm (node), bun, go, rust, uv (python) | On |
| Dev tools | gh, claude | On |
| Infrastructure | tailscale, cloudflared, syncthing | Off |

## kos CLI

```bash
kos doctor      # Check tool availability, report missing
kos setup       # Configure name/email/github
kos auth        # Authenticate gh, linear, claude
kos onboard     # Interactive lessons for agentic workflows
kos cheatsheet  # Print alias/command reference
kos status      # Fast health check
```

## Dotfiles

Managed via GNU Stow. Each package in `dotfiles/` maps to `$HOME`:

- `zsh/.zshrc` — Shell config with tool init guards and aliases
- `git/.gitconfig` — Includes `~/.gitconfig.local` for personal overrides
- `starship/.config/starship.toml` — Minimal prompt
- `tmux/.tmux.conf` — Mouse, base-index 1, fast escape
- `ssh/.ssh/config` — Includes `~/.ssh/config.local`
- `vim/.vimrc` — Standard vim config

## Project Structure

```
kos-kit/
├── install.sh          # Bash installer entry point
├── lib/                # Bash modules (detect, utils, install, dotfiles)
├── dotfiles/           # GNU Stow packages
├── tools/              # CLIs (linear, tmx)
├── cli/                # kos meta-CLI (Bun + citty)
├── lessons/            # Onboard markdown lessons
└── package.json        # Bun workspaces
```

## License

MIT
