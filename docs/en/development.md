# 🛠️ Development

This page is for developers who want to modify and build the application from source, including
the GUI frontend and the core `libssconverter` logic via the Rust backend. If you only want to use
the application, see [Installation](install.md) instead.

## 🛠️ Tech stack

- **Application Framework & Backend**: [Tauri v2](https://v2.tauri.app/) (Rust)
- **Frontend Build Tool**: [Vite](https://vitejs.dev/)
- **Frontend UI**: TypeScript / HTML / Vanilla CSS (no heavy frameworks used)
- **Core Conversion Logic**: [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK)
  (`ssconverter` Rust crate)

## ⚙️ Prerequisites

To build and run this application from source, you need the following environment:

- **Node.js**: `v26` or higher recommended. We use `pnpm` as the package manager; if you haven't
  installed it yet, run `npm install -g pnpm` (or `corepack enable pnpm`) beforehand.
- **Rust Toolchain**: installed via [rustup](https://rustup.rs/).
- The [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your specific OS
  (e.g. C++ Build Tools on Windows, Xcode Command Line Tools on macOS, the required libraries on
  Linux).

## 🚀 Setup and run

### 1. Clone the repository and submodules

This project uses `SpriteStudio-SDK` as a submodule for the core logic. Be sure to clone with the
`--recursive` flag.

```bash
git clone --recursive https://github.com/cri-middleware/SSConverterGUI.git
cd SSConverterGUI
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run in development mode

This compiles the core logic and launches the GUI with hot-reloading enabled.

```bash
pnpm run tauri dev
```

### 4. Build the application

This generates a standalone executable.

```bash
pnpm run tauri build
```

### 5. Build a release archive (optional)

`pnpm run tauri build` gives you a bare executable. To reproduce what a release run actually
uploads — the same archive name and layout, with `LICENSE.md`, `LICENSE.ja.md` and `THIRD_PARTY_NOTICES.md`
bundled in — run `build-release`. It **is** what `.github/workflows/release.yml` runs, so a local
run catches a packaging, signing or cross-compilation problem without dispatching a release.

```bash
# macOS (universal: Apple Silicon + Intel)
scripts/build-release.sh

# quicker while iterating — the archive then differs from the released one
scripts/build-release.sh sign=no notices=no
```

```powershell
# Windows (x86_64, plus the arm64 cross-build)
./scripts/build-release.ps1

# just one of them
./scripts/build-release.ps1 arch=x86_64
```

Each builds the half of the release its own machine can — through `scripts/release-macos.sh` and
`scripts/release-windows.ps1`, which are where the platform build itself lives — then checks the
archive and writes `SHA256SUMS` beside it. The archives land in `dist-release/`, which is
git-ignored.

Once the archives from both machines are in one directory, `scripts/build-release.sh build=no`
checks all three together and writes the manifest over them. That is the workflow's last step,
and the check that matters: a matrix entry that built nothing, or a stale archive from an earlier
version, would otherwise be attached to the Release unnoticed.

`--help` lists every option. The ones worth knowing:

- **Notices**: generated with [cargo-about](https://github.com/EmbarkStudios/cargo-about)
  (`cargo install cargo-about`). Pass `notices=no` to skip that step for a quicker check — the
  archive then differs from the released one.
- **Windows arm64**: needs the **MSVC v143 - VS 2022 C++ ARM64 build tools** component from the
  Visual Studio Installer. The script adds the Rust target itself. The result cannot be run on the
  x86_64 host that built it — test it on an Arm device. `arch=x86_64` skips it.
- **macOS signing and notarization**: opt-in, via the same variables the workflow uses. Set
  `APPLE_SIGNING_IDENTITY` to sign, and add `APPLE_API_KEY` / `APPLE_API_ISSUER` plus either
  `APPLE_API_KEY_PATH` or `APPLE_API_KEY_BASE64` to notarize and staple. The script then inspects
  the finished `.app` and **fails** if what you asked for did not actually happen — a missing or
  expired credential otherwise turns signing into a silent no-op. With none of the variables set
  you get an unsigned app and only a note saying so. `sign=yes` requires a signed, notarized and
  stapled app whatever the environment says (what CI passes on a `v*` tag) and `sign=no` ignores
  the variables entirely. Leave `APPLE_CERTIFICATE` unset locally: CI uses it to hand the Tauri
  CLI a `.p12` to import into a temporary keychain, whereas locally the identity is resolved from
  the keychains you already have (`security find-identity -v -p codesigning`).
  The Windows executable is deliberately **not** code-signed, so there is no `sign=` on that side.

## 📚 Building the documentation

This site is built with [Zensical](https://zensical.org/), the successor to MkDocs and the
Material theme, matching the other SpriteStudio player repositories. The sources live under
`docs/en/` and `docs/ja/`, and two scripts do the whole job.

### macOS / Linux (bash)

```bash
scripts/prepare-docs.sh          # once: .venv + docs/requirements.txt
scripts/build-docs.sh            # exactly what CI runs; fails on broken links / missing nav

.venv/bin/zensical serve                   # live preview of English at http://127.0.0.1:8000
.venv/bin/zensical serve -f mkdocs.ja.yml  # ... or of Japanese
```

### Windows (PowerShell)

```powershell
scripts\prepare-docs.ps1
scripts\build-docs.ps1

.\.venv\Scripts\zensical serve                   # live preview of English
.\.venv\Scripts\zensical serve -f mkdocs.ja.yml  # ... or of Japanese
```

Both scripts take `key=value` options and `--help` — `build-docs.sh locale=ja`,
`prepare-docs.sh force=yes`. `serve` has no script on purpose: it validates nothing and serves
one locale at a time, so it is no substitute for the build.

Zensical builds **one locale per configuration**, so there is one build per locale and
`build-docs` runs them in the only safe order: English first, because it writes `site/` and
clears it on the way in — and the Japanese site lives inside it at `site/ja`. Building only
English therefore leaves no Japanese site at all.

Every page exists twice — once under `docs/en/` and once under `docs/ja/`. When you add, move, or
rename a page, do it in **both** locales and add the entry to the `nav` of **both**
`mkdocs.yml` and `mkdocs.ja.yml`, or the strict build will fail.
