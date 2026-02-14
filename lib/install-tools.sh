#!/bin/bash
# Tool installers — one function per category
# Each tool is tagged: critical (abort on fail) or recommended (warn and continue)

# --- Helpers ---

# Install a tool. Critical tools abort on failure, recommended warn.
# Usage: install_tool <name> <classification> <install_fn>
install_tool() {
  local name="$1"
  local classification="$2" # critical | recommended
  local install_fn="$3"

  if has "$name"; then
    info "$name already installed"
    return 0
  fi

  warn "Installing $name..."
  if $install_fn; then
    info "$name installed"
  else
    if [[ "$classification" == "critical" ]]; then
      die "Failed to install $name (critical tool)"
    else
      error "Failed to install $name (skipping)"
      return 0
    fi
  fi
}

# --- Category: Core ---
# git, zsh, tmux, stow, curl, jq — always installed, critical

install_core() {
  step "Core tools"

  for tool in git zsh tmux stow curl jq; do
    install_tool "$tool" critical _install_core_pkg
  done

  # Set zsh as default shell if it isn't already
  local zsh_path
  zsh_path="$(which zsh)"
  if [[ "$(basename "$SHELL")" != "zsh" ]] && [[ -n "$zsh_path" ]]; then
    info "Setting zsh as default shell"
    sudo chsh -s "$zsh_path" "$(whoami)" 2>/dev/null || warn "Could not set zsh as default shell — run: chsh -s $zsh_path"
  fi
}

_install_core_pkg() {
  # Uses the last $tool from the calling loop (bash dynamic scope)
  pkg_install "$tool"
}

# --- Category: Terminal ---
# Ghostty — recommended

install_terminal() {
  step "Terminal"

  if [[ "$KOS_OS" == "macos" ]]; then
    if [[ -d "/Applications/Ghostty.app" ]]; then
      info "Ghostty already installed"
    else
      warn "Ghostty: Download from https://ghostty.org/download"
    fi
  else
    install_tool "ghostty" recommended _install_ghostty_linux
  fi
}

_install_ghostty_linux() {
  # Ghostty doesn't have a simple apt package yet — point to docs
  warn "Ghostty on Linux: see https://ghostty.org/docs/install/binary"
  return 1
}

# --- Category: Shell ---
# starship, eza, bat, fd, ripgrep, fzf, zoxide, direnv, gum, atuin, git-delta, tlrc (tldr), yq

install_shell_tools() {
  step "Shell tools"

  # Map tool names to their brew/apt package names where different
  _install_shell_starship()  { _install_via_curl_or_pkg starship "starship" "curl -sS https://starship.rs/install.sh | sh -s -- -y"; }
  _install_shell_eza()       { pkg_install eza; }
  _install_shell_bat()       { pkg_install bat; }
  _install_shell_fd()        { _install_with_names fd "fd" "fd-find"; }
  _install_shell_rg()        { _install_with_names rg "ripgrep" "ripgrep"; }
  _install_shell_fzf()       { pkg_install fzf; }
  _install_shell_zoxide()    { pkg_install zoxide; }
  _install_shell_direnv()    { pkg_install direnv; }
  _install_shell_gum()       { _install_gum; }
  _install_shell_atuin()     { _install_via_curl_or_pkg atuin "atuin" "curl -sSf https://setup.atuin.sh | bash"; }
  _install_shell_delta()     { _install_with_names delta "git-delta" "git-delta"; }
  _install_shell_tldr()      { _install_with_names tldr "tlrc" "tldr"; }
  _install_shell_yq()        { pkg_install yq; }

  local tools=(starship eza bat fd rg fzf zoxide direnv gum atuin delta tldr yq)
  for t in "${tools[@]}"; do
    install_tool "$t" recommended "_install_shell_$t"
  done
}

_install_with_names() {
  local cmd="$1" mac_pkg="$2" deb_pkg="$3"
  case "$KOS_OS" in
    macos)  brew install "$mac_pkg" ;;
    debian) sudo apt-get install -y "$deb_pkg" ;;
    redhat) sudo dnf install -y "$deb_pkg" ;;
  esac
}

_install_via_curl_or_pkg() {
  local mac_pkg="$2" curl_cmd="$3"
  case "$KOS_OS" in
    macos) brew install "$mac_pkg" ;;
    *)     eval "$curl_cmd" ;;
  esac
}

_install_gum() {
  case "$KOS_OS" in
    macos)  brew install gum ;;
    debian)
      # Charm's apt repo
      sudo mkdir -p /etc/apt/keyrings
      curl -fsSL https://repo.charm.sh/apt/gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/charm.gpg
      echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | sudo tee /etc/apt/sources.list.d/charm.list
      sudo apt-get update -qq && sudo apt-get install -y gum
      ;;
    redhat)
      echo '[charm]
name=Charm
baseurl=https://repo.charm.sh/yum/
enabled=1
gpgcheck=1
gpgkey=https://repo.charm.sh/yum/gpg.key' | sudo tee /etc/yum.repos.d/charm.repo
      sudo dnf install -y gum
      ;;
  esac
}

# --- Category: Languages ---
# fnm (node), bun (critical), go, rust, uv (python)

install_languages() {
  step "Languages"

  install_tool "bun" critical _install_bun
  install_tool "fnm" recommended _install_fnm
  install_tool "go" recommended _install_go
  install_tool "rustup" recommended _install_rust
  install_tool "uv" recommended _install_uv
}

_install_bun() {
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
}

_install_fnm() {
  case "$KOS_OS" in
    macos) brew install fnm ;;
    *)     curl -fsSL https://fnm.vercel.app/install | bash ;;
  esac
}

_install_go() {
  case "$KOS_OS" in
    macos) brew install go ;;
    *)
      local version="1.23.6"
      local arch="$KOS_ARCH"
      [[ "$arch" == "x86_64" ]] && arch="amd64"
      curl -fsSL "https://go.dev/dl/go${version}.linux-${arch}.tar.gz" | sudo tar -C /usr/local -xzf -
      ;;
  esac
}

_install_rust() {
  curl -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env" 2>/dev/null || true
}

_install_uv() {
  curl -LsSf https://astral.sh/uv/install.sh | sh
}

# --- Category: Dev Tools ---
# gh, claude — recommended

install_dev_tools() {
  step "Dev tools"

  install_tool "gh" recommended _install_gh
  install_tool "claude" recommended _install_claude
}

_install_gh() {
  case "$KOS_OS" in
    macos) brew install gh ;;
    debian)
      curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
      sudo apt-get update -qq && sudo apt-get install -y gh
      ;;
    redhat) sudo dnf install -y gh ;;
  esac
}

_install_claude() {
  if has bun; then
    bun install -g @anthropic-ai/claude-code
  elif has npm; then
    npm install -g @anthropic-ai/claude-code
  else
    warn "Need bun or npm to install Claude Code"
    return 1
  fi
}

# --- Category: Infrastructure ---
# tailscale, cloudflared, syncthing — off by default, recommended

install_infrastructure() {
  step "Infrastructure"

  install_tool "tailscale" recommended _install_tailscale
  install_tool "cloudflared" recommended _install_cloudflared
  install_tool "syncthing" recommended _install_syncthing
}

_install_tailscale() {
  case "$KOS_OS" in
    macos)
      if [[ -d "/Applications/Tailscale.app" ]]; then
        info "Tailscale app installed"
        warn "Enable CLI: Tailscale menu > Settings > Enable CLI"
        return 0
      fi
      warn "Download Tailscale: https://tailscale.com/download/mac"
      return 1
      ;;
    *) curl -fsSL https://tailscale.com/install.sh | sh ;;
  esac
}

_install_cloudflared() {
  case "$KOS_OS" in
    macos) brew install cloudflared ;;
    debian)
      curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
      echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
      sudo apt-get update -qq && sudo apt-get install -y cloudflared
      ;;
    redhat) sudo dnf install -y cloudflared ;;
  esac
}

_install_syncthing() {
  pkg_install syncthing
}
