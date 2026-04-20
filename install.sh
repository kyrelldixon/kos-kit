#!/usr/bin/env bash
# kos-kit prereq installer
# Installs the minimum toolchain needed to run `kos setup`, then hands off.
set -euo pipefail

os="$(uname)"

install_prereqs_macos() {
  if ! command -v brew >/dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
  brew install mise chezmoi bun gum
}

install_prereqs_linux() {
  command -v mise    >/dev/null || curl -fsSL https://mise.run       | sh
  command -v chezmoi >/dev/null || sh -c "$(curl -fsLS get.chezmoi.io)"
  command -v bun     >/dev/null || curl -fsSL https://bun.sh/install | bash
  if ! command -v gum >/dev/null; then
    echo "gum is required but not installed."
    echo "Install via: https://github.com/charmbracelet/gum#installation"
    exit 1
  fi
}

case "$os" in
  Darwin) install_prereqs_macos ;;
  Linux)  install_prereqs_linux ;;
  *)      echo "Unsupported OS: $os"; exit 1 ;;
esac

: "${KOS_DIR:=$HOME/.kos-kit}"
if [ ! -d "$KOS_DIR" ]; then
  git clone https://github.com/kyrelldixon/kos-kit.git "$KOS_DIR"
fi
cd "$KOS_DIR"
bun install
(cd cli && bun link)

exec kos setup "$@"
