#!/usr/bin/env bash
#
# Build the release: this machine's half of it -- the archive a consumer
# downloads, signed and notarized when the environment carries the credentials
# -- then check what is there and write the checksum manifest over it.
#
#   scripts/build-release.sh                            # build macOS universal, then check
#   scripts/build-release.sh notices=no                 # quicker, but not what ships
#   scripts/build-release.sh sign=no                    # ignore any APPLE_* in the environment
#   scripts/build-release.sh build=no in=release-dist   # check the matrix's three archives
#
# release.yml runs this script for everything it uploads -- once per macOS
# matrix entry to build, once in the package job to collect -- so CI and a local
# run cannot drift. The workflow keeps only what is GitHub's: the checkout, the
# toolchain, the artifact download, the artifact upload and the Release itself.
#
# The build is delegated, not reimplemented. scripts/release-macos.sh builds,
# signs, notarizes, verifies and archives the macOS universal app, and
# scripts/build-release.ps1 does the same for Windows through
# scripts/release-windows.ps1. Those two are where a platform's build lives,
# because that is where the platform's own tools are; this is the one entry
# point that runs the right one and then checks what came out of it.
#
# One machine cannot produce a whole release -- the universal .app needs macOS
# and the two portable .exe archives need Windows -- so a build run requires
# only what it built. Requiring all three is what build=no means: the phase
# after the matrix, where every archive has arrived and a missing one is a
# Release with no download for that platform. That is the quiet failure this
# catches, and the reason the check exists at all: three jobs on two operating
# systems feed one directory, and nobody notices the gap until somebody on that
# platform tries.
#
# This is also the phase AFTER it has been decided what is being released: the
# tag comes from the checkout, not from an option, and it must match
# package.json.
set -euo pipefail

APP="$(basename "$0")"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# The archives a release is made of: one per matrix entry, named by the arch the
# entry builds. Adding a matrix entry means adding it here, which is deliberate
# -- the list is what makes a missing platform an error rather than a smaller
# release.
#
#   <arch>:<extension>
EXPECTED="universal:tar.gz x86_64:zip arm64:zip"

# What a build run on this machine produces. The other two are build-release.ps1's.
BUILT="universal:tar.gz"

# --- options --------------------------------------------------------------

BUILD="yes"
IN="dist-release"
IN_GIVEN="no"
SIGN="auto"
NOTICES="yes"
VERIFY="yes"

usage () {
  echo "Usage: $APP [options]"
  echo "$APP options:"
  echo "  build=<yes|no>          Build this machine's archive before checking (default:"
  echo "                          $BUILD) -- scripts/release-macos.sh, the macOS universal"
  echo "                          app. no is the phase after the build matrix: check the"
  echo "                          archives that are already in <in> and write SHA256SUMS"
  echo "                          over them, which is what release.yml's package job runs."
  echo "  in=<dir>                Where the archives are (default: dist-release, which is"
  echo "                          where release-macos.sh writes -- so build=yes cannot be"
  echo "                          pointed elsewhere). With build=no this is what to check:"
  echo "                          the workflow downloads every build artifact into"
  echo "                          release-dist with merge-multiple, so they land side by"
  echo "                          side."
  echo "  sign=<auto|yes|no>      Code signing and notarization (default: $SIGN), which is"
  echo "                          the environment's to decide: release-macos.sh signs when"
  echo "                          APPLE_SIGNING_IDENTITY is set, and notarizes and staples"
  echo "                          when the APPLE_API_* credentials are set as well."
  echo "                          yes additionally requires the finished .app to be signed,"
  echo "                          notarized and stapled, and fails when it is not -- what"
  echo "                          release.yml passes on a v* tag, because a missing or"
  echo "                          expired credential otherwise turns signing into a silent"
  echo "                          no-op. no takes the APPLE_* variables out of the"
  echo "                          environment, for a quick unsigned build."
  echo "  notices=<yes|no>        Generate THIRD_PARTY_NOTICES.md into the archive"
  echo "                          (default: $NOTICES, and it needs cargo-about). no is"
  echo "                          quicker, and the archive then differs from the released"
  echo "                          one."
  echo "  verify=<yes|no>         Check the archives before writing SHA256SUMS"
  echo "                          (default: $VERIFY). no writes the manifest over"
  echo "                          whatever is there, which is not a thing to ship."
    echo "  out= clean= sdk= skip=  Accepted and ignored here. The family's build-release"
  echo "                          scripts share out= clean= verify= in= sdk= skip=,"
  echo "                          so one command line drives all of them."
echo "  -h | --help             Show this help"
  echo ""
  echo "Output: the archive(s) in <in>, and SHA256SUMS beside them -- the set release.yml"
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
        build)   BUILD="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')" ;;
        in)      IN="$value"; IN_GIVEN="yes" ;;
        sign)    SIGN="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')" ;;
        notices) NOTICES="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')" ;;
        verify)  VERIFY="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')" ;;
        # Accepted so one command line drives build-release in every repository
        # of the family; this one has no use for them.
        out|clean|sdk|skip) echo "$APP: ${key}= does not apply here; ignored" >&2 ;;
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

case "$BUILD"   in yes|no)      ;; *) echo "$APP: build must be yes or no (got '$BUILD')" >&2; exit 2 ;; esac
case "$SIGN"    in auto|yes|no) ;; *) echo "$APP: sign must be auto, yes or no (got '$SIGN')" >&2; exit 2 ;; esac
case "$NOTICES" in yes|no)      ;; *) echo "$APP: notices must be yes or no (got '$NOTICES')" >&2; exit 2 ;; esac
case "$VERIFY"  in yes|no)      ;; *) echo "$APP: verify must be yes or no (got '$VERIFY')" >&2; exit 2 ;; esac

# A path that was given is relative to where it was typed; the default is
# relative to the repo, so it means the same directory from anywhere.
if [ "$IN_GIVEN" = "yes" ]; then
  case "$IN" in /*) ;; *) IN="$PWD/$IN" ;; esac
else
  IN="$ROOT_DIR/$IN"
fi

cd "$ROOT_DIR"

# release-macos.sh writes into dist-release and offers no say in it, so a build
# run cannot be pointed somewhere else: it would build one place and check
# another, and report an empty directory as a platform that produced nothing.
if [ "$BUILD" = "yes" ] && [ "$IN" != "$ROOT_DIR/dist-release" ]; then
  echo "$APP: in=$IN with build=yes -- release-macos.sh writes into $ROOT_DIR/dist-release." >&2
  echo "$APP: drop in= to build there, or pass build=no to check archives somewhere else." >&2
  exit 2
fi

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
echo "  build    => $BUILD"
echo "  in       => $IN"
if [ "$BUILD" = "yes" ]; then
  echo "  sign     => $SIGN"
  echo "  notices  => $NOTICES"
fi
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

# --- helpers ---------------------------------------------------------------

step () {
  echo ""
  echo ">> $*"
}

FAILED=""
fail () {
  FAILED="${FAILED}
  $1"
}

# Anything named like a release archive but not one of this release's is either
# a stale build from an earlier version or a name nobody expects -- both end up
# attached to the Release by the `*.zip` / `*.tar.gz` globs, so say so rather
# than ship it.
scan_unknown () {
  for f in "$IN"/*.tar.gz "$IN"/*.zip; do
    [ -e "$f" ] || continue
    base="$(basename "$f")"
    known=no
    for spec in $EXPECTED; do
      [ "$base" = "SSConverterGUI_${VERSION}_${spec%%:*}.${spec#*:}" ] && known=yes
    done
    [ "$known" = yes ] || fail "$base is in $IN but is not one of this release's archives"
  done
}

# --- build -----------------------------------------------------------------
if [ "$BUILD" = "yes" ]; then
  case "$(uname -s)" in
    Darwin) ;;
    *)
      echo "$APP: build=yes builds the macOS half of the release, and that needs macOS (this is $(uname -s))." >&2
      echo "$APP: on Windows run scripts/build-release.ps1; anywhere else, build=no checks archives that are already here." >&2
      exit 1
      ;;
  esac

  # Before the build, not after it: a stale archive from an earlier version is a
  # one-line fix, and finding it at the end means finding it a whole universal
  # build later.
  if [ "$VERIFY" = "yes" ] && [ -d "$IN" ]; then
    scan_unknown
    if [ -n "$FAILED" ]; then
      echo "" >&2
      echo "$APP: $IN holds archives that are not this release's:$FAILED" >&2
      echo "$APP: remove them first -- they would be attached to the Release alongside the current ones." >&2
      exit 1
    fi
  fi

  step "building SSConverterGUI $VERSION -- macOS universal"

  ARGS=""
  if [ "$NOTICES" = "no" ]; then ARGS="$ARGS --skip-notices"; fi
  if [ "$SIGN" = "yes" ]; then ARGS="$ARGS --require-signing"; fi

  # $ARGS unquoted on purpose: it is this script's own fixed flags, and the
  # empty case has to expand to no argument at all.
  if [ "$SIGN" = "no" ]; then
    # Not "don't pass the credentials" -- release-macos.sh reads them from the
    # environment it inherits, so they have to be taken out of it.
    env -u APPLE_SIGNING_IDENTITY -u APPLE_CERTIFICATE -u APPLE_CERTIFICATE_PASSWORD \
        -u APPLE_API_KEY_BASE64 -u APPLE_API_KEY_PATH -u APPLE_API_KEY -u APPLE_API_ISSUER \
        ./scripts/release-macos.sh $ARGS
  else
    ./scripts/release-macos.sh $ARGS
  fi
fi

# --- preflight -------------------------------------------------------------

if [ ! -d "$IN" ]; then
  echo "$APP: $IN does not exist" >&2
  echo "$APP: populate it first -- 'gh run download <run-id> -D $(basename "$IN")' -- or" >&2
  echo "$APP: build it (drop build=no), or point in= at the archives" >&2
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

# What has to be here. A build run produced one platform's archive and cannot
# have produced the others, so only that one is required; collecting is the
# phase where the whole release has arrived, and every archive is.
if [ "$BUILD" = "yes" ]; then
  REQUIRED="$BUILT"
else
  REQUIRED="$EXPECTED"
fi

# --- check the archives ---------------------------------------------------
if [ "$VERIFY" = "yes" ]; then
  step "checking $IN"

  FAILED=""
  for spec in $REQUIRED; do
    arch="${spec%%:*}"
    ext="${spec#*:}"
    name="SSConverterGUI_${VERSION}_${arch}.${ext}"
    if [ ! -f "$IN/$name" ]; then
      if [ "$BUILD" = "yes" ]; then
        fail "$name is missing (the build produced nothing, or named it differently)"
      else
        fail "$name is missing (its matrix entry produced nothing, or named it differently)"
      fi
    elif [ ! -s "$IN/$name" ]; then
      fail "$name is empty"
    else
      echo "   $name  ($(($(wc -c < "$IN/$name") / 1048576)) MB)"
    fi
  done

  scan_unknown

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
if [ "$BUILD" = "yes" ]; then
  echo "$APP: this machine's half of the release. The Windows archives come from"
  echo "$APP: scripts/build-release.ps1 on Windows; build=no checks the three together."
else
  echo "$APP: this is what release.yml attaches to the draft Release."
fi
