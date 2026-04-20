#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
set -e

VERSION=$(jq -r .version package.json)
TAG="$VERSION"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: tag $TAG already exists. Bump version in package.json first."
  exit 1
fi

# Build for multiple platforms
echo "Building $TAG ..."
mkdir -p dist

bash scripts/build.sh dist/gbl-darwin-arm64 bun-darwin-arm64

# Compress
tar -czf dist/gbl-darwin-arm64.tar.gz -C dist gbl-darwin-arm64

# Create git tag
git tag -a "$TAG" -m "Release $TAG"
git push origin "$TAG"

# Create GitHub release with assets
echo "Creating GitHub release $TAG ..."
gh release create "$TAG" dist/gbl-darwin-arm64.tar.gz \
  --title "$TAG" \
  --notes "Release $TAG"

echo "Published $TAG"

# Normalise the origin URL to https://host/owner/repo. Handles:
#   https://host/owner/repo(.git)(/)
#   ssh://[user@]host[:port]/owner/repo(.git)(/)
#   [user@]host:owner/repo(.git)     (scp-like)
origin_url=$(git remote get-url origin)
https_url=$(printf '%s\n' "$origin_url" | sed -E \
  -e 's|^https?://([^@/]+@)?([^/]+)/(.+)$|https://\2/\3|' \
  -e 's|^ssh://([^@/]+@)?([^:/]+)(:[0-9]+)?/(.+)$|https://\2/\4|' \
  -e 's|^([^@/]+@)?([^:/]+):([^/].*)$|https://\2/\3|' \
  -e 's|\.git/?$||' \
  -e 's|/$||')
echo "$https_url/releases/tag/$TAG"
