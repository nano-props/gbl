#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
set -e

VERSION=$(jq -r .version package.json)
TAG="v$VERSION"

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

bun build src/main.ts --compile --target=bun-darwin-arm64 --outfile dist/gbl-darwin-arm64

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
echo "https://$(git remote get-url origin | sed 's|git@||;s|:|/|;s|\.git$||')/releases/tag/$TAG"
