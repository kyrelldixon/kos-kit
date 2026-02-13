#!/bin/bash
# kos-kit installer
# Usage: bash install.sh [--yes]
set -euo pipefail

KOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source lib modules
source "$KOS_DIR/lib/utils.sh"
source "$KOS_DIR/lib/detect.sh"
source "$KOS_DIR/lib/install-tools.sh"
source "$KOS_DIR/lib/dotfiles.sh"

# Parse flags
AUTO_YES=false
for arg in "$@"; do
  case "$arg" in
    --yes|-y) AUTO_YES=true ;;
  esac
done

# --- Main ---

main() {
  echo ""
  echo "  kos-kit installer"
  echo "  ================="
  echo ""

  # Detect environment
  detect_env

  # Ensure package manager is ready
  ensure_brew
  ensure_apt

  # Always install core tools first (critical)
  install_core

  # Category selection
  local categories
  if [[ "$AUTO_YES" == true ]]; then
    # Non-interactive: install all default-on categories
    categories=("Terminal" "Shell" "Languages" "Dev tools")
  else
    step "Select categories to install"
    # gum_choose returns one selection per line — strip tool list after " — "
    local selections=()
    while IFS= read -r line; do
      [[ -n "$line" ]] && selections+=("$line")
    done < <(gum_choose "Which tool categories?" \
      "Terminal — Ghostty" \
      "Shell — starship, eza, bat, fd, ripgrep, fzf, zoxide, direnv, gum, atuin, git-delta, tldr, yq" \
      "Languages — bun, fnm (node), go, rust, uv (python)" \
      "Dev tools — gh, claude" \
      "Infrastructure — tailscale, cloudflared, syncthing")

    categories=()
    for sel in "${selections[@]}"; do
      categories+=("${sel%% — *}")
    done
  fi

  # Install selected categories
  for cat in "${categories[@]}"; do
    case "$cat" in
      Terminal)       install_terminal ;;
      Shell)          install_shell_tools ;;
      Languages)      install_languages ;;
      "Dev tools")    install_dev_tools ;;
      Infrastructure) install_infrastructure ;;
    esac
  done

  # Dotfiles
  step "Dotfiles"
  if [[ "$AUTO_YES" == true ]] || gum_confirm "Stow dotfiles?"; then
    stow_dotfiles
  else
    warn "Skipping dotfiles"
  fi

  # Link CLIs
  step "CLIs"
  if has bun; then
    info "Installing workspace dependencies"
    bun install --cwd "$KOS_DIR"
    info "Linking CLIs to PATH"
    bun link --cwd "$KOS_DIR/tools/linear"
    bun link --cwd "$KOS_DIR/tools/tmx"
    bun link --cwd "$KOS_DIR/cli"
  else
    warn "Bun not available, skipping CLI linking"
  fi

  # Done
  echo ""
  info "Installation complete!"
  echo ""
  echo "  Next steps:"
  echo "    kos doctor    — verify everything is working"
  echo "    kos setup     — configure name/email/github"
  echo "    kos auth      — authenticate gh, linear, claude"
  echo ""
}

main "$@"
