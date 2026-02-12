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
    stow -d "$DOTFILES_DIR" -t "$HOME" --no-folding "$pkg"
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

    # If target exists and is NOT a symlink (stow creates symlinks)
    if [[ -f "$target" && ! -L "$target" ]]; then
      local backup_path="$backup_dir/$rel"
      mkdir -p "$(dirname "$backup_path")"
      mv "$target" "$backup_path"
      warn "Backed up $target → $backup_path"
    fi
  done < <(find "$pkg_dir" -type f -print0)
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
