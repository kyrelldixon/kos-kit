#!/bin/bash
# Deploy agent-platform to the local machine
# Usage: bash deploy-agent-platform.sh [--install]
#   --install  First-time setup: copy plist + bootstrap service
#   (default)  Update: pull, build, restart
set -euo pipefail

KOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$HOME/projects/agent-platform"
PLIST_NAME="com.kyrelldixon.agent-platform"
PLIST_SRC="$KOS_DIR/services/$PLIST_NAME.plist"
PLIST_DST="/Library/LaunchDaemons/$PLIST_NAME.plist"
SERVICE="system/$PLIST_NAME"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${GREEN}[+]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }
step()  { echo -e "\n${BOLD}==> $1${NC}"; }

# Check prerequisites
check_prereqs() {
  command -v bun &>/dev/null || error "bun not found. Run kos-kit install first."
  command -v git &>/dev/null || error "git not found."

  local bun_path
  bun_path="$(which bun)"
  info "bun: $bun_path"
}

# Clone repo if missing
ensure_repo() {
  if [[ ! -d "$REPO_DIR/.git" ]]; then
    step "Cloning agent-platform"
    mkdir -p "$(dirname "$REPO_DIR")"
    git clone git@github.com:kyrelldixon/agent-platform.git "$REPO_DIR"
  fi
}

# Pull latest, install deps, build client
build() {
  step "Updating agent-platform"
  cd "$REPO_DIR"

  info "Pulling latest..."
  git pull --ff-only

  info "Installing dependencies..."
  bun install

  info "Building client..."
  bun run build:client

  info "Build complete"
}

# First-time: copy plist and bootstrap the service
install_service() {
  step "Installing LaunchDaemon"

  if [[ ! -f "$PLIST_SRC" ]]; then
    error "Plist not found at $PLIST_SRC"
  fi

  # Ensure log directory exists
  mkdir -p "$HOME/Library/Logs"

  info "Copying plist to $PLIST_DST"
  sudo cp "$PLIST_SRC" "$PLIST_DST"
  sudo chown root:wheel "$PLIST_DST"
  sudo chmod 644 "$PLIST_DST"

  info "Bootstrapping service..."
  sudo launchctl bootstrap system "$PLIST_DST"

  info "Service installed and running"
}

# Restart existing service
restart_service() {
  step "Restarting service"
  sudo launchctl kickstart -k "$SERVICE"
  info "Service restarted"
}

# Check service status
check_status() {
  step "Status"
  if sudo launchctl print "$SERVICE" &>/dev/null; then
    info "Service is loaded"
    # Quick health check
    sleep 1
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3400 | grep -q "200\|304"; then
      info "Server responding on port 3400"
    else
      warn "Server not responding yet — check logs: tail -f ~/Library/Logs/agent-platform.log"
    fi
  else
    warn "Service is not loaded"
  fi
}

# --- Main ---

main() {
  echo ""
  echo "  agent-platform deploy"
  echo "  ====================="
  echo ""

  check_prereqs

  local install=false
  for arg in "$@"; do
    case "$arg" in
      --install) install=true ;;
    esac
  done

  ensure_repo
  build

  if [[ "$install" == true ]]; then
    install_service
  else
    if sudo launchctl print "$SERVICE" &>/dev/null; then
      restart_service
    else
      warn "Service not installed yet. Run with --install for first-time setup."
      return 1
    fi
  fi

  check_status
}

main "$@"
