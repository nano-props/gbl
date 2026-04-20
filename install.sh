#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
set -e

INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

bash scripts/build.sh "$INSTALL_DIR/gbl"
bun run clean
echo "Installed gbl to $INSTALL_DIR/gbl"
