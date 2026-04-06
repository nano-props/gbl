#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
set -e

INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

bun build src/main.ts --compile --outfile "$INSTALL_DIR/gbl"
bun run clean
echo "Installed gbl to $INSTALL_DIR/gbl"
