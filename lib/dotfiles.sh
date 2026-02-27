#!/bin/bash
# GNU Stow wrapper for dotfiles

DOTFILES_DIR="$KOS_DIR/dotfiles"

# Stow all dotfile packages
stow_dotfiles() {
  if ! has stow; then
    warn "GNU Stow not installed, skipping dotfiles"
    return 1
  fi

  local packages=(zsh git starship tmux ssh vim)

  for pkg in "${packages[@]}"; do
    local pkg_dir="$DOTFILES_DIR/$pkg"
    [[ ! -d "$pkg_dir" ]] && continue

    # Backup any existing files that would conflict
    _backup_conflicts "$pkg"

    info "Stowing $pkg"
    if ! stow -d "$DOTFILES_DIR" -t "$HOME" --no-folding "$pkg"; then
      warn "Failed to stow $pkg, continuing..."
    fi
  done
}

# Backup files that would conflict with stow
_backup_conflicts() {
  local pkg="$1"
  local pkg_dir="$DOTFILES_DIR/$pkg"
  local backup_dir="$HOME/.kos-backup"

  # Walk the package to find target files
  while IFS= read -r -d '' file; do
    local rel="${file#"$pkg_dir/"}"
    local target="$HOME/$rel"

    if [[ -L "$target" ]]; then
      # Symlink exists but not managed by stow — remove it
      local link_target
      link_target="$(readlink "$target")"
      if [[ "$link_target" != *"$DOTFILES_DIR"* ]]; then
        rm "$target"
        warn "Removed old symlink $target → $link_target"
      fi
    elif [[ -f "$target" ]]; then
      # Regular file — back it up
      local backup_path="$backup_dir/$rel"
      mkdir -p "$(dirname "$backup_path")"
      mv "$target" "$backup_path"
      warn "Backed up $target → $backup_path"
    fi
  done < <(find "$pkg_dir" -type f -print0)
}

# Prompt for git name/email and write ~/.gitconfig.local
# Receives pre-stow defaults as arguments
setup_git_identity() {
  local default_name="${1:-}"
  local default_email="${2:-}"

  # Skip if .gitconfig.local already has identity
  local existing_name existing_email
  existing_name="$(git config --file "$HOME/.gitconfig.local" user.name 2>/dev/null || true)"
  existing_email="$(git config --file "$HOME/.gitconfig.local" user.email 2>/dev/null || true)"

  if [[ -n "$existing_name" && -n "$existing_email" ]]; then
    info "Git identity already configured ($existing_name <$existing_email>)"
    return 0
  fi

  step "Git identity"

  local name email

  if [[ "$AUTO_YES" == true ]]; then
    if [[ -z "$default_name" || -z "$default_email" ]]; then
      warn "Git identity not configured — run: kos setup"
      return 0
    fi
    name="$default_name"
    email="$default_email"
    info "Using existing git identity: $name <$email>"
  else
    name="$(gum_input "Name" "$default_name")"
    email="$(gum_input "Email" "$default_email")"

    if [[ -z "$name" || -z "$email" ]]; then
      warn "Skipping git identity — run: kos setup"
      return 0
    fi
  fi

  # Write ~/.gitconfig.local — same format as kos setup (setup.ts:30)
  printf '[user]\n\tname = %s\n\temail = %s\n' "$name" "$email" > "$HOME/.gitconfig.local"
  info "Wrote ~/.gitconfig.local"
}

# Unstow all packages (for removal)
unstow_dotfiles() {
  local packages=(zsh git starship tmux ssh vim)
  for pkg in "${packages[@]}"; do
    [[ -d "$DOTFILES_DIR/$pkg" ]] || continue
    stow -d "$DOTFILES_DIR" -t "$HOME" -D "$pkg"
    info "Unstowed $pkg"
  done
}
