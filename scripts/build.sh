#!/usr/bin/env bash
# Build the gbl binary. On macOS, re-apply an ad-hoc code signature so that
# AMFI (macOS 26+) won't SIGKILL the compiled binary at launch.
#
# Usage: scripts/build.sh [outfile] [target]
#   outfile: output path (default: dist/gbl)
#   target:  bun --target value, e.g. bun-darwin-arm64 (default: host)

set -e

cd "$(dirname "$0")/.."

OUT="${1:-dist/gbl}"
TARGET="${2:-}"

mkdir -p "$(dirname "$OUT")"

CMD=(bun build src/main.ts --compile --outfile "$OUT")
if [ -n "$TARGET" ]; then
  CMD+=(--target="$TARGET")
fi

"${CMD[@]}"

# macOS: re-sign so AMFI accepts the binary.
# Bun's embedded ad-hoc signature can be rejected on macOS 26+; strip and re-sign.
if [ "$(uname)" = "Darwin" ]; then
  codesign --remove-signature "$OUT" 2>/dev/null || true
  codesign --force --sign - "$OUT"
fi
