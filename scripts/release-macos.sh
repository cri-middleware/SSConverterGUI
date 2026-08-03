#!/usr/bin/env bash
# Builds the macOS release archive the way .github/workflows/release.yml does,
# so a release build can be verified locally before one is dispatched.
#
# Output: dist-release/SSConverterGUI_<version>_universal.app.tar.gz
#
# Code signing and notarization are opt-in via the environment — see the block
# below.
#
# Usage:
#   scripts/release-macos.sh [--skip-notices]
#
#   --skip-notices  Skip generating THIRD_PARTY_NOTICES.md. Quicker, but the
#                   archive then differs from the released one.

set -euo pipefail

skip_notices=0
for arg in "$@"; do
  case "$arg" in
    --skip-notices) skip_notices=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

version="$(node -p "require('./package.json').version")"
out_dir="dist-release"
app_dir="src-tauri/target/universal-apple-darwin/release/bundle/macos"
archive="SSConverterGUI_${version}_universal.app.tar.gz"

echo "==> SSConverterGUI ${version} — macOS universal"

# --- Code signing & notarization (opt-in via env) -----------------------------
# `tauri build` signs and notarizes in place when these are set, which is how the
# release workflow does it. The names mirror the SS_APPLE_* GitHub secrets:
#
#   APPLE_SIGNING_IDENTITY  "Developer ID Application: … (TEAMID)"
#   APPLE_API_KEY_PATH      path to the App Store Connect .p8 private key
#   APPLE_API_KEY           its key ID
#   APPLE_API_ISSUER        the issuer ID
#
# APPLE_API_KEY_BASE64 is accepted too and decoded below, as the workflow's
# "Prepare Apple API key" step does. There is deliberately no APPLE_CERTIFICATE
# import: that is tauri-action's job on a throwaway CI keychain, so locally the
# identity has to be in a keychain already — `security find-identity -v -p codesigning`.
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

# The universal binary links both slices, so both targets must be installed.
rustup target add aarch64-apple-darwin x86_64-apple-darwin

pnpm install --frozen-lockfile
pnpm exec tauri build --bundles app --target universal-apple-darwin

app_name="$(basename "$(ls -d "$app_dir"/*.app | head -1)")"
app_path="${app_dir}/${app_name}"

# Inspect what the build produced rather than trusting that the env was
# populated: a missing or expired credential turns signing into a silent no-op.
# Only the checks the environment opted into are fatal, so an unsigned local
# build still packages.
echo "==> Checking signature and notarization"
status=0
if codesign --verify --deep --strict "$app_path" 2>/dev/null \
  && codesign -dvv "$app_path" 2>&1 | grep -q 'Authority=Developer ID Application'; then
  echo "    signed with a Developer ID Application certificate"
else
  echo "    not signed by a Developer ID Application certificate"
  if [ "$sign" -eq 1 ]; then status=1; fi
fi
# A stapled ticket is what lets Gatekeeper clear the app offline.
if xcrun stapler validate "$app_path" >/dev/null 2>&1; then
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

# Ship the app alongside the license and third-party notices, as the workflow does.
staged_files=(LICENSE.md)
cp LICENSE.md "$app_dir/"

if [ "$skip_notices" -eq 1 ]; then
  echo "==> Skipping third-party license notices (--skip-notices)"
  rm -f "$app_dir/THIRD_PARTY_NOTICES.md"
else
  echo "==> Generating third-party license notices"
  if ! command -v cargo-about >/dev/null 2>&1; then
    echo "cargo-about is required: cargo install cargo-about (or re-run with --skip-notices)" >&2
    exit 1
  fi
  cargo about generate -c about.toml about.hbs \
    --manifest-path src-tauri/Cargo.toml \
    -o "$app_dir/THIRD_PARTY_NOTICES.md"
  node scripts/gen-npm-notices.mjs "$app_dir/THIRD_PARTY_NOTICES.md"
  staged_files+=(THIRD_PARTY_NOTICES.md)
fi

mkdir -p "$out_dir"
tar -czf "$out_dir/$archive" -C "$app_dir" "$app_name" "${staged_files[@]}"

echo "==> ${out_dir}/${archive}"
shasum -a 256 "$out_dir/$archive"
