#!/usr/bin/env bash
#
# Print the app version -- what a release should be tagged as, and what every
# release archive is named after.
#
#   scripts/release-version.sh          # 7.0.0-beta.1
#   v$(scripts/release-version.sh)      # v7.0.0-beta.1  -- the git tag
#
# It is `version` in package.json, which is the single source: tauri.conf.json
# reads it (`"version": "../package.json"`), the `get_versions` command surfaces
# it at runtime, and release-macos.sh / release-windows.ps1 name their archives
# after it. src-tauri/Cargo.toml carries a copy that has to be bumped with it,
# and this prints nothing but an error while the two disagree.
#
# The tag is what names a release -- release.yml is dispatched from a v* tag and
# takes the name from that ref. This is what the tag *must* be: build-release.sh
# refuses a tag that disagrees, because a Release called v1.2.3 carrying
# SSConverterGUI_1.2.4_universal.tar.gz is worse than no release at all.
set -euo pipefail

APP="$(basename "$0")"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

case "${1:-}" in
  -h|--help|help)
    echo "Usage: $APP"
    echo "Prints \"version\" from package.json (no leading 'v')."
    exit 0
    ;;
  "") ;;
  *)
    echo "$APP: unexpected argument '$1' (see $APP --help)" >&2
    exit 2
    ;;
esac

MANIFEST="$ROOT_DIR/package.json"
if [ ! -f "$MANIFEST" ]; then
  echo "$APP: $MANIFEST not found -- is this the SSConverterGUI repo?" >&2
  exit 1
fi

if ! command -v node > /dev/null 2>&1; then
  echo "$APP: node not found -- it is what reads package.json (and what builds the app)" >&2
  exit 1
fi

VERSION="$(cd "$ROOT_DIR" && node -p "require('./package.json').version || ''")"

if [ -z "$VERSION" ]; then
  echo "$APP: package.json has no \"version\"" >&2
  exit 1
fi

CRATE_VERSION="$(
  awk '
    /^[[:space:]]*\[/ { in_package = ($0 ~ /^[[:space:]]*\[package\][[:space:]]*$/); next }
    in_package && /^[[:space:]]*version[[:space:]]*=/ {
      sub(/^[^=]*=[[:space:]]*/, "")
      sub(/[[:space:]]*#.*$/, "")
      gsub(/"/, "")
      gsub(/[[:space:]]/, "")
      print
      exit
    }
  ' "$ROOT_DIR/src-tauri/Cargo.toml"
)"

if [ "$CRATE_VERSION" != "$VERSION" ]; then
  echo "$APP: src-tauri/Cargo.toml says '$CRATE_VERSION', package.json says '$VERSION' -- bump them together" >&2
  exit 1
fi

printf '%s\n' "$VERSION"
