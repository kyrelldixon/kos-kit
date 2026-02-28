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

  # Install gum before tool selection (needed for interactive prompts)
  install_tool "gum" recommended _install_gum

  # Always install bun (critical for kos CLI)
  step "Languages"
  install_tool "bun" critical _install_bun

  # Build tool selection list from manifest
  local -a picker_items=() auto_selected=()
  for record in "${TOOLS_MANIFEST[@]}"; do
    IFS=: read -r m_cmd m_display m_cat m_class m_fn m_os <<< "$record"
    [[ -n "$m_os" && "$m_os" != "$KOS_OS" ]] && continue

    local inst=0
    _tool_is_installed "$m_cmd" && inst=1

    picker_items+=("${m_display}|${m_cmd}|${inst}|${m_cat}")

    # --yes mode: select uninstalled tools, skip Apps and Infrastructure
    if [[ "$m_cat" != "Infrastructure" && "$m_cat" != "Apps" && "$inst" == "0" ]]; then
      auto_selected+=("$m_cmd")
    fi
  done

  local -a selected_cmds=()
  if [[ "$AUTO_YES" == true ]]; then
    selected_cmds=("${auto_selected[@]+"${auto_selected[@]}"}")
  else
    step "Select tools to install"
    while IFS= read -r cmd; do
      [[ -n "$cmd" ]] && selected_cmds+=("$cmd")
    done < <(gum_choose_tools "Space = select · Enter = confirm · [installed] = already present" \
      "${picker_items[@]+"${picker_items[@]}"}")
  fi

  # Install selected tools, grouped by category for step headers
  for cat in "Shell" "Languages" "Dev tools" "Apps" "Infrastructure" "Fun"; do
    local -a cat_cmds=()
    for record in "${TOOLS_MANIFEST[@]}"; do
      IFS=: read -r m_cmd m_display m_cat m_class m_fn m_os <<< "$record"
      [[ "$m_cat" != "$cat" ]] && continue
      for sel in "${selected_cmds[@]+"${selected_cmds[@]}"}"; do
        [[ "$sel" == "$m_cmd" ]] && cat_cmds+=("$m_cmd") && break
      done
    done

    if [[ "${#cat_cmds[@]}" -gt 0 ]]; then
      step "$cat"
      install_selected_tools "${cat_cmds[@]}"
    fi
  done

  # Capture git identity BEFORE stow replaces ~/.gitconfig
  local _git_name _git_email
  _git_name="$(git config --global user.name 2>/dev/null || true)"
  _git_email="$(git config --global user.email 2>/dev/null || true)"

  # Dotfiles
  step "Dotfiles"
  if [[ "$AUTO_YES" == true ]] || gum_confirm "Stow dotfiles?"; then
    stow_dotfiles
  else
    warn "Skipping dotfiles"
  fi

  # Git identity — write ~/.gitconfig.local
  setup_git_identity "$_git_name" "$_git_email"

  # Link CLIs
  step "CLIs"
  if has bun; then
    info "Installing workspace dependencies"
    bun install --silent --cwd "$KOS_DIR"
    info "Linking CLIs to PATH"
    bun link --silent --cwd "$KOS_DIR/tools/linear"
    bun link --silent --cwd "$KOS_DIR/tools/tmx"
    bun link --silent --cwd "$KOS_DIR/cli"
  else
    warn "Bun not available, skipping CLI linking"
  fi

  # Done
  echo ""
  info "Installation complete!"
  echo ""
  echo "  Next steps:"
  if [[ "$(basename "$SHELL")" != "zsh" ]]; then
    echo "    Open a new terminal to use zsh (now your default shell)"
  fi
  echo "    kos doctor    — verify everything is working"
  echo "    kos setup     — configure name/email/github"
  echo "    kos auth      — authenticate gh, linear, claude"
  echo ""
}

main "$@"
