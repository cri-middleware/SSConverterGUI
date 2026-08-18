#!/usr/bin/env bash
#
# Collect the release: check the per-platform archives the build matrix
# produced, and write the checksum manifest over them.
#
#   scripts/build-release.sh                  # collect from release-dist/
#   scripts/build-release.sh in=/tmp/dl
#
# release.yml's package job runs this script for the assets it uploads, so CI
# and a local run cannot drift. The workflow keeps only what is GitHub's -- the
# artifact download, the artifact upload and the Release itself.
#
# There is less to do here than in the sibling repos, and that is the point:
# scripts/release-macos.sh and scripts/release-windows.ps1 already build,
# sign, notarize and archive their own platform, each writing a finished
# dist-release/SSConverterGUI_<version>_<arch>.<ext>. Nothing needs to be laid
# out afterwards. What was left in the workflow was two lines of sha256sum and
# no check at all -- so what this adds is the check.
#
# Which matters because the archives arrive from three separate jobs on two
# operating systems, and the failure this catches is a quiet one: a matrix entry
# that built nothing, or built something named after the wrong version, leaves a
# Release that simply has no download for that platform. Nobody notices until
# somebody on that platform tries.
#
# This is the phase AFTER it has been decided what is being released: the tag
# comes from the checkout, not from an option, and it must match package.json.
set -euo pipefail

APP="$(basename "$0")"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# The archives the matrix produces: one per entry, named by the arch the entry
# builds. Adding a matrix entry means adding it here, which is deliberate -- the
# list is what makes a missing platform an error rather than a smaller release.
#
#   <arch>:<extension>
EXPECTED="universal:tar.gz x86_64:zip arm64:zip"

# --- options --------------------------------------------------------------

IN="release-dist"
VERIFY="yes"

usage () {
  echo "Usage: $APP [options]"
  echo "$APP options:"
  echo "  in=<dir>                Where the per-platform archives are (default: $IN)."
  echo "                          The workflow downloads every build artifact into it"
  echo "                          with merge-multiple, so they all land side by side;"
  echo "                          locally that is what release-macos.sh and"
  echo "                          release-windows.ps1 write into dist-release."
  echo "  verify=<yes|no>         Check the archives before writing SHA256SUMS"
  echo "                          (default: $VERIFY). no writes the manifest over"
  echo "                          whatever is there, which is not a thing to ship."
  echo "  -h | --help             Show this help"
  echo ""
  echo "Output: SHA256SUMS in <in>, beside the archives it covers -- the set release.yml"
  echo "attaches to the draft Release."
  echo ""
  echo "There is no option for which release this is: the tag comes from the checkout"
  echo "this runs in (the ref the workflow was dispatched from, or 'git checkout <tag>'"
  echo "locally), and it must match package.json's version."
}

while [ $# -gt 0 ]; do
  item="$1"
  shift

  case "$item" in
    -h|--help|help)
      usage
      exit 0
      ;;
    *=*)
      key="${item%%=*}"
      value="${item#*=}"
      case "$key" in
        in)     IN="$value" ;;
        verify) VERIFY="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')" ;;
        *)
          echo "$APP: unknown option '$key' (see $APP --help)" >&2
          exit 2
          ;;
      esac
      ;;
    *)
      echo "$APP: unknown argument '$item' (options are key=value; see $APP --help)" >&2
      exit 2
      ;;
  esac
done

case "$VERIFY" in yes|no) ;; *) echo "$APP: verify must be yes or no (got '$VERIFY')" >&2; exit 2 ;; esac

case "$IN" in /*) ;; *) IN="$PWD/$IN" ;; esac

cd "$ROOT_DIR"

# --- what this release is called ------------------------------------------
VERSION="$(./scripts/release-version.sh)"
MANIFEST_TAG="v${VERSION}"

if [ "${GITHUB_REF_TYPE:-}" = "tag" ] && [ -n "${GITHUB_REF_NAME:-}" ]; then
  TAG="$GITHUB_REF_NAME"
  TAG_SOURCE="GITHUB_REF_NAME -- the ref this release was dispatched from"
elif TAG="$(git -C "$ROOT_DIR" describe --exact-match --match 'v[0-9]*' --tags HEAD 2>/dev/null)"; then
  TAG_SOURCE="the release tag HEAD is checked out at"
else
  TAG=""
  TAG_SOURCE="HEAD is not on a release tag, so this is a build, not a release"
fi

echo "options"
echo "  in       => $IN"
echo "  verify   => $VERIFY"
echo "  version  => $VERSION"
echo "  tag      => ${TAG:-(none)}"
echo "              ($TAG_SOURCE)"

# A tag that disagrees with package.json is not a warning: every archive is
# named after package.json's version, so the Release would be called one thing
# and carry files called another.
if [ -n "$TAG" ] && [ "$TAG" != "$MANIFEST_TAG" ]; then
  echo "" >&2
  echo "$APP: tag $TAG does not match package.json ($MANIFEST_TAG)." >&2
  echo "$APP: bump the version (and src-tauri/Cargo.toml with it), or retag -- the" >&2
  echo "$APP: archives are named SSConverterGUI_${VERSION}_*." >&2
  exit 1
fi

# --- preflight ------------------------------------------------------------

if [ ! -d "$IN" ]; then
  echo "$APP: $IN does not exist" >&2
  echo "$APP: populate it first -- 'gh run download <run-id> -D $(basename "$IN")' -- or" >&2
  echo "$APP: point in= at the archives (locally, dist-release)" >&2
  exit 1
fi

# The runners have sha256sum (coreutils); macOS ships shasum instead. Both write
# the same `<hash>  <name>` lines and both take -c, so SHA256SUMS is identical
# either way -- which is the only reason a release can be collected from either.
if command -v sha256sum > /dev/null 2>&1; then
  sha256 () { sha256sum "$@"; }
elif command -v shasum > /dev/null 2>&1; then
  sha256 () { shasum -a 256 "$@"; }
else
  echo "$APP: neither sha256sum nor shasum found -- one of them writes SHA256SUMS" >&2
  exit 1
fi

step () {
  echo ""
  echo ">> $*"
}

FAILED=""
fail () {
  FAILED="${FAILED}
  $1"
}

# --- check the archives ---------------------------------------------------
if [ "$VERIFY" = "yes" ]; then
  step "checking $IN"

  for spec in $EXPECTED; do
    arch="${spec%%:*}"
    ext="${spec#*:}"
    name="SSConverterGUI_${VERSION}_${arch}.${ext}"
    if [ ! -f "$IN/$name" ]; then
      fail "$name is missing (its matrix entry produced nothing, or named it differently)"
    elif [ ! -s "$IN/$name" ]; then
      fail "$name is empty"
    else
      echo "   $name  ($(($(wc -c < "$IN/$name") / 1048576)) MB)"
    fi
  done

  # Anything else named like a release archive is either a stale build from an
  # earlier version or a name nobody expects -- both end up attached to the
  # Release by the `*.zip` / `*.tar.gz` globs, so say so rather than ship it.
  for f in "$IN"/*.tar.gz "$IN"/*.zip; do
    [ -e "$f" ] || continue
    base="$(basename "$f")"
    known=no
    for spec in $EXPECTED; do
      [ "$base" = "SSConverterGUI_${VERSION}_${spec%%:*}.${spec#*:}" ] && known=yes
    done
    [ "$known" = yes ] || fail "$base is in $IN but is not one of this release's archives"
  done

  if [ -n "$FAILED" ]; then
    echo "" >&2
    echo "$APP: the release in $IN is not shippable:$FAILED" >&2
    exit 1
  fi
else
  step "verify=no -- the archives are not checked"
fi

# --- checksums -------------------------------------------------------------
# Canonical manifest so a consumer can verify each downloaded file's integrity
# (`sha256sum -c SHA256SUMS --ignore-missing` for a partial download).
# Sorted by name, not by glob: `*.tar.gz *.zip` would list every tarball before
# every zip, which is a different file from what the .ps1 twin writes over the
# same archives. One order, so the two are byte-identical.
step "writing SHA256SUMS"
(
  cd "$IN"
  : > SHA256SUMS
  # One name per line through the loop, rather than xargs: sha256 is a shell
  # function (sha256sum here, shasum -a 256 on macOS) and xargs can only exec a
  # real command -- it would silently find some other sha256 on PATH and write a
  # manifest in a different format.
  find . -maxdepth 1 \( -name '*.tar.gz' -o -name '*.zip' \) \
    | sed 's|^\./||' | sort | while IFS= read -r archive; do
        sha256 "$archive" >> SHA256SUMS
      done
)
sed 's|^|   |' "$IN/SHA256SUMS"

if [ "$VERIFY" = "yes" ]; then
  ( cd "$IN" && sha256 -c SHA256SUMS > /dev/null ) || {
    echo "$APP: SHA256SUMS does not verify against the files it was just written from" >&2
    exit 1
  }
  echo ""
  echo "   all checks passed"
fi

# --- done ------------------------------------------------------------------
echo ""
echo "$APP: done -> $IN  (${TAG:-$MANIFEST_TAG})"
echo ""
echo "$APP: this is what release.yml attaches to the draft Release."
