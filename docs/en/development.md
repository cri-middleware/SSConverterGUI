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
uploads — the same archive name and layout, with `LICENSE.md` and `THIRD_PARTY_NOTICES.md`
bundled in — use the release scripts. They mirror `.github/workflows/release.yml` step for step,
so a local run catches a packaging or cross-compilation problem without dispatching a release.

```bash
# macOS (universal: Apple Silicon + Intel)
scripts/release-macos.sh
```

```powershell
# Windows x86_64 (host build)
./scripts/release-windows.ps1

# Windows arm64 (cross-compiled from an x86_64 host, exactly as CI does)
./scripts/release-windows.ps1 -Arch arm64
```

The archives land in `dist-release/`, which is git-ignored.

- **Notices**: generated with [cargo-about](https://github.com/EmbarkStudios/cargo-about)
  (`cargo install cargo-about`). Pass `--skip-notices` / `-SkipNotices` to skip that step for a
  quicker check — the archive then differs from the released one.
- **Windows arm64**: needs the **MSVC v143 - VS 2022 C++ ARM64 build tools** component from the
  Visual Studio Installer. The script adds the Rust target itself. The result cannot be run on the
  x86_64 host that built it — test it on an Arm device.
- **macOS signing and notarization**: opt-in, via the same variables the workflow uses. Set
  `APPLE_SIGNING_IDENTITY` to sign, and add `APPLE_API_KEY` / `APPLE_API_ISSUER` plus either
  `APPLE_API_KEY_PATH` or `APPLE_API_KEY_BASE64` to notarize and staple. The script then inspects
  the finished `.app` and **fails** if what you asked for did not actually happen — a missing or
  expired credential otherwise turns signing into a silent no-op. With none of the variables set
  you get an unsigned app and only a note saying so. Leave `APPLE_CERTIFICATE` unset locally: CI
  uses it to hand the Tauri CLI a `.p12` to import into a temporary keychain, whereas locally the
  identity is resolved from the keychains you already have
  (`security find-identity -v -p codesigning`).

## 📚 Building the documentation

This site is built with [MkDocs](https://www.mkdocs.org/) and the
[Material](https://squidfunk.github.io/mkdocs-material/) theme, matching the other SpriteStudio
player repositories. The sources live under `docs/en/` and `docs/ja/`.

### macOS / Linux (bash)

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r docs/requirements.txt

.venv/bin/mkdocs serve           # live preview at http://127.0.0.1:8000
.venv/bin/mkdocs build --strict  # exactly what CI runs; fails on broken links / missing nav
```

### Windows (PowerShell)

```powershell
py -m venv .venv
.\.venv\Scripts\python -m pip install -r docs/requirements.txt

.\.venv\Scripts\mkdocs serve           # live preview at http://127.0.0.1:8000
.\.venv\Scripts\mkdocs build --strict  # exactly what CI runs; fails on broken links / missing nav
```

Every page exists twice — once under `docs/en/` and once under `docs/ja/`. When you add, move, or
rename a page, do it in **both** locales and add a matching `nav_translations` entry in
`mkdocs.yml`, or the strict build will fail.
