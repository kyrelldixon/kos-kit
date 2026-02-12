#!/bin/bash
# OS and architecture detection

detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    KOS_OS="macos"
  elif [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian) KOS_OS="debian" ;;
      fedora|rhel|centos) KOS_OS="redhat" ;;
      *) die "Unsupported Linux distribution: $ID" ;;
    esac
  else
    die "Unsupported operating system: $OSTYPE"
  fi
}

detect_arch() {
  local arch
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) KOS_ARCH="x86_64" ;;
    arm64|aarch64) KOS_ARCH="arm64" ;;
    *) die "Unsupported architecture: $arch" ;;
  esac
}

detect_env() {
  detect_os
  detect_arch
  info "Detected: $KOS_OS ($KOS_ARCH)"
}
