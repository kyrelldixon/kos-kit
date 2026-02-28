#!/bin/bash
# Tool installers and manifest
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

# --- Tool Manifest ---
# Format: cmd:display:category:classification:install_fn[:os_filter]
# - critical tools (bun) are installed unconditionally before the picker
# - os_filter: "macos" = only shown/installed on macOS
# No field may contain colons.
TOOLS_MANIFEST=(
  # Shell
  "starship:starship:Shell:recommended:_install_starship"
  "eza:eza:Shell:recommended:_install_eza"
  "bat:bat:Shell:recommended:_install_bat"
  "fd:fd:Shell:recommended:_install_fd"
  "rg:ripgrep:Shell:recommended:_install_rg"
  "fzf:fzf:Shell:recommended:_install_fzf"
  "zoxide:zoxide:Shell:recommended:_install_zoxide"
  "direnv:direnv:Shell:recommended:_install_direnv"
  "gum:gum:Shell:recommended:_install_gum"
  "atuin:atuin:Shell:recommended:_install_atuin"
  "delta:git-delta:Shell:recommended:_install_delta"
  "tldr:tldr:Shell:recommended:_install_tldr"
  "yq:yq:Shell:recommended:_install_yq"

  # Languages (bun is critical — installed separately, not in picker)
  "fnm:fnm (node):Languages:recommended:_install_fnm"
  "go:go:Languages:recommended:_install_go"
  "rustup:rust:Languages:recommended:_install_rust"
  "uv:uv (python):Languages:recommended:_install_uv"

  # Dev tools
  "gh:gh:Dev tools:recommended:_install_gh"
  "claude:claude:Dev tools:recommended:_install_claude"

  # Apps (GUI — skipped in --yes mode)
  "ghostty:Ghostty:Apps:recommended:_install_ghostty"
  "orb:OrbStack:Apps:recommended:_install_orbstack:macos"

  # Infrastructure (off by default in --yes mode)
  "tailscale:tailscale:Infrastructure:recommended:_install_tailscale"
  "cloudflared:cloudflared:Infrastructure:recommended:_install_cloudflared"
  "syncthing:syncthing:Infrastructure:recommended:_install_syncthing"

  # Fun
  "figlet:figlet:Fun:recommended:_install_figlet"
  "lolcat:lolcat:Fun:recommended:_install_lolcat:macos"
  "toilet:toilet:Fun:recommended:_install_toilet"
)

# Check if a tool is already installed (custom checks for some tools)
_tool_is_installed() {
  local cmd="$1"
  case "$cmd" in
    ghostty)
      if [[ "$KOS_OS" == "macos" ]]; then
        [[ -d "/Applications/Ghostty.app" ]]
      else
        has ghostty
      fi
      ;;
    tailscale)
      if [[ "$KOS_OS" == "macos" ]]; then
        [[ -d "/Applications/Tailscale.app" ]] || has tailscale
      else
        has tailscale
      fi
      ;;
    *) has "$cmd" ;;
  esac
}

# Install tools by command name, looking up each in the manifest
install_selected_tools() {
  for cmd in "$@"; do
    for record in "${TOOLS_MANIFEST[@]}"; do
      IFS=: read -r m_cmd m_display m_cat m_class m_fn m_os <<< "$record"
      if [[ "$m_cmd" == "$cmd" ]]; then
        [[ -n "$m_os" && "$m_os" != "$KOS_OS" ]] && break
        install_tool "$m_cmd" "$m_class" "$m_fn"
        break
      fi
    done
  done
}

# --- Core (always installed, critical) ---

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
  # Uses $tool from the calling loop (bash dynamic scope)
  pkg_install "$tool"
}

# --- Shell tool installers ---

_install_starship() { mkdir -p "$HOME/.local/bin" && _install_via_curl_or_pkg starship "starship" "curl -sS https://starship.rs/install.sh | sh -s -- -y -b \$HOME/.local/bin"; }
_install_eza()      { pkg_install eza; }
_install_bat()      { pkg_install bat; }
_install_fd()       { _install_with_names fd "fd" "fd-find"; }
_install_rg()       { _install_with_names rg "ripgrep" "ripgrep"; }
_install_fzf()      { pkg_install fzf; }
_install_zoxide()   { pkg_install zoxide; }
_install_direnv()   { pkg_install direnv; }
_install_atuin()    { _install_via_curl_or_pkg atuin "atuin" "curl -sSf https://setup.atuin.sh | bash"; }
_install_delta()    { _install_with_names delta "git-delta" "git-delta"; }
_install_tldr()     { _install_with_names tldr "tlrc" "tldr"; }
_install_yq()       { pkg_install yq; }

_install_gum() {
  case "$KOS_OS" in
    macos)  brew install gum ;;
    debian)
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

# --- Language installers ---

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

# --- Dev tool installers ---

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

# --- App installers ---

_install_ghostty() {
  if [[ "$KOS_OS" == "macos" ]]; then
    warn "Ghostty: Download from https://ghostty.org/download"
    return 1
  else
    warn "Ghostty on Linux: see https://ghostty.org/docs/install/binary"
    return 1
  fi
}

_install_orbstack() {
  brew install orbstack
}

# --- Infrastructure installers ---

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

# --- Fun installers ---

_install_figlet() { pkg_install figlet; }
_install_lolcat() { pkg_install lolcat; }
_install_toilet()  { _install_with_names toilet "toilet" "toilet"; }
