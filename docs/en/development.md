# Development

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
