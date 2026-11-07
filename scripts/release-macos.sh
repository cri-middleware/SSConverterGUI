#!/usr/bin/env bash
# Builds the macOS release archive the way .github/workflows/release.yml does,
# so a release build can be verified locally before one is dispatched.
#
# scripts/build-release.sh is the entry point: it runs this and then checks the
# archive that came out of it, and that is what the workflow calls. Running this
# directly is fine — it is the whole macOS build — but the checks are there.
#
# Output: dist-release/SSConverterGUI_<version>_universal.tar.gz
#
# Code signing and notarization are opt-in via the environment — see the block
# below.
#
# Usage:
#   scripts/release-macos.sh [--skip-notices] [--require-signing]
#
#   --skip-notices     Skip generating THIRD_PARTY_NOTICES.md. Quicker, but the
#                      archive then differs from the released one.
#   --require-signing  Treat a build that is not signed, notarized and stapled as
#                      a failure even when the environment says nothing was
#                      requested. The release workflow passes this on a v* tag.

set -euo pipefail

skip_notices=0
require_signing=0
for arg in "$@"; do
  case "$arg" in
    --skip-notices) skip_notices=1 ;;
    --require-signing) require_signing=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

version="$(node -p "require('./package.json').version")"
out_dir="dist-release"
app_dir="src-tauri/target/universal-apple-darwin/release/bundle/macos"
# The archive holds the app plus the license files, so it cannot extract to a
# single item. Finder therefore invents a containing folder named after the
# archive — which is why the name must not end in `.app`: a folder with that
# extension is an application bundle to LaunchServices, and double-clicking one
# with no Contents/ fails with "damaged or incomplete". The tar carries its own
# root directory of the same name so every extractor produces exactly this.
stage_name="SSConverterGUI_${version}_universal"
archive="${stage_name}.tar.gz"

echo "==> SSConverterGUI ${version} — macOS universal"

# --- Code signing & notarization (opt-in via env) -----------------------------
# `tauri build` signs and notarizes in place when these are set, which is how the
# release workflow does it. The workflow feeds them from the APPLE_DEV_ID_APP_*
# / ASC_API_* GitHub secrets:
#
#   APPLE_SIGNING_IDENTITY  "Developer ID Application: … (TEAMID)"
#   APPLE_API_KEY_PATH      path to the App Store Connect .p8 private key
#   APPLE_API_KEY           its key ID
#   APPLE_API_ISSUER        the issuer ID
#
# APPLE_API_KEY_BASE64 is accepted too and decoded below, which is what the
# workflow's "Prepare Apple API key" step already does for CI.
#
# Nothing here touches a keychain. The Tauri CLI handles that: with
# APPLE_CERTIFICATE and APPLE_CERTIFICATE_PASSWORD set — how CI supplies the
# .p12 — it imports them into a temporary keychain of its own; without them it
# resolves APPLE_SIGNING_IDENTITY against the keychains you already have, which
# is the local case. So leave them unset locally and keep the identity in your
# login keychain — `security find-identity -v -p codesigning`.
if [ -n "${APPLE_API_KEY_BASE64:-}" ] && [ -z "${APPLE_API_KEY_PATH:-}" ]; then
  api_key_file="$(mktemp -t ssconverter_apple_api_key)"
  # The private key must not outlive this build.
  trap 'rm -f "$api_key_file"' EXIT
  printf '%s' "${APPLE_API_KEY_BASE64}" | base64 --decode > "$api_key_file"
  export APPLE_API_KEY_PATH="$api_key_file"
fi

sign=0
notarize=0
if [ -n "${APPLE_SIGNING_IDENTITY:-}" ]; then
  sign=1
  echo "==> Code signing as: ${APPLE_SIGNING_IDENTITY}"
  if [ -n "${APPLE_API_KEY_PATH:-}" ] && [ -n "${APPLE_API_KEY:-}" ] && [ -n "${APPLE_API_ISSUER:-}" ]; then
    notarize=1
    echo "==> Notarizing with the App Store Connect API key"
  else
    echo "==> Skipping notarization (APPLE_API_KEY_PATH / APPLE_API_KEY / APPLE_API_ISSUER not all set)"
  fi
else
  echo "==> Skipping code signing (APPLE_SIGNING_IDENTITY not set)"
fi

# An unset or expired secret looks exactly like "signing was never requested",
# so a release build asserts the outcome instead of trusting the environment.
if [ "$require_signing" -eq 1 ]; then
  echo "==> Signing and notarization are required for this build"
  sign=1
  notarize=1
fi

# The universal binary links both slices, so both targets must be installed.
rustup target add aarch64-apple-darwin x86_64-apple-darwin

pnpm install --frozen-lockfile
pnpm exec tauri build --bundles app --target universal-apple-darwin

app_name="$(basename "$(ls -d "$app_dir"/*.app | head -1)")"

# Stage the archive's contents first so the checks below run against exactly
# what ships. `ditto` is what copies a bundle without dropping the extended
# attributes a signature depends on.
echo "==> Staging ${stage_name}/"
stage="${out_dir}/${stage_name}"
rm -rf "$stage"
mkdir -p "$stage"
ditto "${app_dir}/${app_name}" "${stage}/${app_name}"
cp LICENSE.md LICENSE.ja.md "$stage/"
app_path="${stage}/${app_name}"

# Inspect what the build produced rather than trusting that the env was
# populated: a missing or expired credential turns signing into a silent no-op.
# Only the checks the environment opted into are fatal, so an unsigned local
# build still packages.
echo "==> Checking signature and notarization"
status=0
signed=0
# Captured, not piped: under pipefail, `grep -q` stops at the first match and
# codesign dies of SIGPIPE, failing a correctly signed app.
if codesign --verify --deep --strict "$app_path" 2>/dev/null \
  && grep -q '^Authority=Developer ID Application' <<< "$(codesign -dvv "$app_path" 2>&1)"; then
  signed=1
  echo "    signed with a Developer ID Application certificate"
else
  echo "    not signed by a Developer ID Application certificate"
  if [ "$sign" -eq 1 ]; then status=1; fi
fi
# A stapled ticket is what lets Gatekeeper clear the app offline. Tauri staples
# as soon as notarytool reports Accepted and ignores the stapler's exit status,
# but the ticket is not always published by then, so a missing one is fetched
# again here for a few attempts.
stapled=0
if xcrun stapler validate "$app_path" >/dev/null 2>&1; then
  stapled=1
elif [ "$notarize" -eq 1 ] && [ "$signed" -eq 1 ]; then
  for attempt in 1 2 3 4 5 6; do
    if xcrun stapler staple "$app_path" >/dev/null 2>&1 \
      && xcrun stapler validate "$app_path" >/dev/null 2>&1; then
      stapled=1
      break
    fi
    if [ "$attempt" -lt 6 ]; then sleep 10; fi
  done
fi
if [ "$stapled" -eq 1 ]; then
  echo "    notarization ticket stapled"
else
  echo "    no stapled notarization ticket"
  if [ "$notarize" -eq 1 ]; then status=1; fi
fi
if spctl --assess --type execute "$app_path" 2>/dev/null; then
  echo "    Gatekeeper accepts the app"
else
  echo "    Gatekeeper would reject the app"
  if [ "$notarize" -eq 1 ]; then status=1; fi
fi
if [ "$status" -ne 0 ]; then
  echo "signing/notarization was requested but the result does not verify — check the APPLE_* variables" >&2
  exit 1
fi

if [ "$skip_notices" -eq 1 ]; then
  echo "==> Skipping third-party license notices (--skip-notices)"
else
  echo "==> Generating third-party license notices"
  if ! command -v cargo-about >/dev/null 2>&1; then
    echo "cargo-about is required: cargo install cargo-about (or re-run with --skip-notices)" >&2
    exit 1
  fi
  cargo about generate -c about.toml about.hbs \
    --manifest-path src-tauri/Cargo.toml \
    -o "$stage/THIRD_PARTY_NOTICES.md"
  node scripts/generate-npm-notices.mjs "$stage/THIRD_PARTY_NOTICES.md"
fi

tar -czf "$out_dir/$archive" -C "$out_dir" "$stage_name"

echo "==> ${out_dir}/${archive}"
shasum -a 256 "$out_dir/$archive"
