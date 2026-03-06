#!/usr/bin/env bash
set -euo pipefail

# CronHub one-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/copialot/cronhub/main/get.sh | bash

REPO="copialot/cronhub"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

URL="https://github.com/${REPO}/releases/latest/download/cronhub-${OS}-${ARCH}.tar.gz"

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

echo "Downloading cronhub-${OS}-${ARCH}..."
curl -fsSL "$URL" | tar xz -C "$tmpdir"
cd "$tmpdir"

# Restore stdin from terminal so interactive prompts work under curl|bash
exec < /dev/tty

if [ "$OS" = "linux" ] && [ "$(id -u)" -ne 0 ]; then
  echo "Linux install requires root. Re-running with sudo..."
  sudo bash install.sh install
else
  bash install.sh install
fi
