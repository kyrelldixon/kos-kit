#!/bin/bash
# kos-kit bootstrap — one-liner entry point for fresh machines
# Usage: curl -fsSL https://raw.githubusercontent.com/kyrelldixon/kos-kit/main/bootstrap.sh | bash
set -euo pipefail

KOS_HOME="$HOME/.kos-kit"
KOS_REPO="https://github.com/kyrelldixon/kos-kit.git"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[+]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }

# --- Ensure git is available ---

ensure_git() {
  if command -v git &>/dev/null; then
    return
  fi

  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: xcode-select triggers the CLI tools install prompt
    info "Installing Xcode Command Line Tools (includes git)..."
    xcode-select --install 2>/dev/null || true
    # Wait for installation to complete
    until command -v git &>/dev/null; do
      sleep 5
    done
  elif [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian)
        info "Installing git..."
        sudo apt-get update -qq && sudo apt-get install -y git
        ;;
      fedora|rhel|centos)
        info "Installing git..."
        sudo dnf install -y git
        ;;
      *) error "Unsupported Linux distribution: $ID. Install git manually and re-run." ;;
    esac
  else
    error "Unsupported OS. Install git manually and re-run."
  fi
}

# --- Clone or update kos-kit ---

ensure_kos_kit() {
  if [[ -d "$KOS_HOME/.git" ]]; then
    info "kos-kit already installed at $KOS_HOME, updating..."
    git -C "$KOS_HOME" pull --ff-only
  else
    if [[ -d "$KOS_HOME" ]]; then
      warn "$KOS_HOME exists but is not a git repo, backing up..."
      mv "$KOS_HOME" "$KOS_HOME.bak.$(date +%s)"
    fi
    info "Cloning kos-kit to $KOS_HOME..."
    git clone "$KOS_REPO" "$KOS_HOME"
  fi
}

# --- Main ---

main() {
  echo ""
  echo "  kos-kit bootstrap"
  echo "  ================="
  echo ""

  ensure_git
  ensure_kos_kit

  info "Running installer..."
  bash "$KOS_HOME/install.sh" "$@"
}

main "$@"
