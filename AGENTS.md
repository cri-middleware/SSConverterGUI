## Operating rules

*   Keep changes scoped to the requested task.
*   Do not commit unless the user explicitly asks.
*   Before editing, read enough surrounding context to understand callers and invariants; if the
    read tool truncated the file, read the remaining ranges before making non-trivial changes.
*   Follow existing code style in touched files (naming, type usage, control flow, error
    handling).
*   **Documentation Updates**: The project maintains dual-language documentation. Root-level files (`README.md`, `CONTRIBUTING.md`) pair an English version (`.md`) with a Japanese one (`.ja.md`); the docs site pairs `docs/en/<path>` with `docs/ja/<path>`. Always update both languages simultaneously to keep them in sync. See **Documentation** under Development Guidelines.

## Project Overview

This is a cross-platform GUI application built with Tauri v2 for converting SpriteStudio (`.sspj`) projects to `.ssab` binaries.

*   **Frontend**: Built with Vite, vanilla TypeScript, HTML, and CSS. Located primarily in the `src/` directory and `index.html`.
*   **Backend**: Built with Rust using the Tauri v2 framework. Located in the `src-tauri/` directory.
*   **Core SDK**: The actual conversion logic relies on the `ssconverter` crate from the `SpriteStudio-SDK`, which is included as a local Git submodule.

## Development Guidelines

### Frontend
*   The frontend avoids heavy frameworks (like React or Vue) and uses vanilla TypeScript for DOM manipulation in `src/main.ts`.
*   Maintain the existing UI styling approach (vanilla CSS in `src/style.css`).
*   Interact with the Rust backend using `@tauri-apps/api/core` (e.g., `invoke` for commands, `listen` for events).

### Backend (Rust)
*   Tauri commands and backend logic are managed in `src-tauri/src/`.
*   Ensure that any new Rust dependencies are added to `src-tauri/Cargo.toml`.
*   The backend handles file system operations, dialogues, and invokes the `ssconverter` functions.
*   **Conversion Logic Reference**: When implementing or modifying the conversion process, please refer to the `SpriteStudio-SDK` submodule. The conversion behavior and options should strictly conform to how the `ssconverter-cli` (located inside the SDK) operates, as it serves as the reference implementation.

### Documentation
*   The docs site is **MkDocs + Material**, matching the sibling repos (`SpriteStudio-Docs`, `SSPlayerForGodot`, `SSPlayerForUnity`, `SSPlayerForRenPy`). Config is `mkdocs.yml`; sources are under `docs/`.
*   **Folder-based i18n** (`mkdocs-static-i18n`, `docs_structure: folder`). Every page exists twice: `docs/en/<path>` and `docs/ja/<path>`. When you add, move, or rename a page, do it in **both** locales, or the strict build breaks. English is the default/fallback locale.
*   **Navigation is defined once** in `mkdocs.yml` under `nav:` using locale-relative paths (e.g. `usage.md`, no `en/` or `ja/` prefix). Japanese nav labels come from the `plugins.i18n.languages` → `nav_translations` map, **not** from the file tree — add a matching `nav_translations` entry whenever you introduce a new nav title.
*   **Internal links are relative file paths** ending in `.md` (e.g. `install.md`), which is what `--strict` validates. Links to other repos' docs are absolute `https://…` URLs.
*   **Pinned toolchain**: `docs/requirements.txt` versions are deliberately pinned and kept in sync with the sibling repos. Bump intentionally.
*   The **README is an entry point, not a duplicate** of the site: it carries the feature list, a quick start, and links into `docs/`. Detailed walkthroughs belong in `docs/`, not the README.
*   Always validate with `mkdocs build --strict` before finishing — CI (`.github/workflows/pages.yml`) runs the same command on every PR touching `docs/` and blocks merge on any broken internal link or nav mismatch.
*   **Publishing is tied to releases**: the site deploys when a GitHub Release is published, or from a manual `workflow_dispatch` run. Merging to `main` does **not** publish — the site documents the released application, so it intentionally tracks releases rather than every merge.

    ```bash
    python -m venv .venv && source .venv/bin/activate
    pip install -r docs/requirements.txt
    mkdocs serve           # live preview at http://127.0.0.1:8000
    mkdocs build --strict  # exactly what CI runs
    ```

### Running & Building
*   **Prerequisites**: Requires Node.js (v26+), `pnpm`, and the Rust toolchain (`rustup`). The repository must be cloned with the `--recursive` flag to fetch the `SpriteStudio-SDK` submodule.
*   Start the development server with: `pnpm run tauri dev`
*   Build the application with: `pnpm run tauri build`
