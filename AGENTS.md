## Operating rules

*   Keep changes scoped to the requested task.
*   Do not commit unless the user explicitly asks.
*   Before editing, read enough surrounding context to understand callers and invariants; if the
    read tool truncated the file, read the remaining ranges before making non-trivial changes.
*   Follow existing code style in touched files (naming, type usage, control flow, error
    handling).
*   **Documentation Updates**: The project keeps documentation in sync across languages. `README.md` pairs with `README.ja.md`; the other root docs (`CONTRIBUTING.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md`) are single files that carry an English section followed by a Japanese one; the docs site pairs `docs/en/<path>` with `docs/ja/<path>`. Update every language of a document together. See **Documentation** under Development Guidelines.

## Project Overview

This is a cross-platform GUI application built with Tauri v2 for converting SpriteStudio (`.sspj`) projects to `.ssab` binaries.

*   **Frontend**: Vite + vanilla TypeScript, HTML, and CSS, in `src/` and `index.html`.
*   **Backend**: Rust with the Tauri v2 framework, in `src-tauri/`.
*   **Core SDK**: The conversion logic comes from the `ssconverter` crate in the `SpriteStudio-SDK` Git submodule.

### Key files

*   `src/main.ts` — all UI wiring: file/folder selection, drag-and-drop, conversion history (localStorage), the progress modal, and `invoke` calls to the backend.
*   `src/utils.ts` — framework-free history logic (`updateHistory`), unit-tested in `src/utils.test.ts`.
*   `src-tauri/src/lib.rs` — the Tauri commands: `convert_sspj`, `cancel_conversion`, `get_versions`, `path_kind`.
*   `src-tauri/tauri.conf.json` and `src-tauri/capabilities/default.json` — app/window config and the granted permission set.

## Documentation site

Folder-based i18n (`mkdocs-static-i18n`, `docs_structure: folder`): every page exists as both `docs/en/<path>` and `docs/ja/<path>`, and `nav` is defined once in `mkdocs.yml` with Japanese labels from `nav_translations`. Three things do **not** follow that "everything twice" rule — check before duplicating:

*   **`overrides/main.html`** (`theme.custom_dir`) emits the Open Graph / Twitter Card tags Material omits. **One template serves both locales**: the i18n plugin substitutes `languages.ja.site_description` before rendering, so Japanese cards need no second copy. Localize by adding a per-locale config override, never by branching in the template. Keep it in sync with the copies in SpriteStudio-Docs and the sibling player repos.
*   **Footer social icons are defined twice** — `extra.social` and the `ja` block's `extra` override, which *replaces* the whole `social` list rather than merging into it. Add or reorder an icon in both, or Japanese readers lose it. Keep `twitter:site` in `overrides/main.html` in sync with the X link.
*   **There is deliberately no `edit_uri`**, so no "edit this page" button renders. It is a branch name nothing validates, and it had drifted wrong in three of the five player repos. Do not reintroduce it.

`mkdocs.yml` sets `strict: true`, so a plain `build` (and `serve`) fails on a broken link or nav mismatch. Nothing builds the docs on a pull request — `pages.yml` runs on `release: published` and dispatch — so the local build is the only gate: `.venv/bin/mkdocs build --strict`.

## Development Guidelines

### Frontend
*   The frontend avoids heavy frameworks (like React or Vue) and uses vanilla TypeScript for DOM manipulation in `src/main.ts`.
*   Maintain the existing UI styling approach (vanilla CSS in `src/style.css`).
*   Interact with the Rust backend using `@tauri-apps/api/core` (e.g., `invoke` for commands, `listen` for events).

### Backend (Rust)
*   Tauri commands and backend logic are managed in `src-tauri/src/`.
*   Ensure that any new Rust dependencies are added to `src-tauri/Cargo.toml`.
*   The backend handles file system operations, dialogues, and invokes the `ssconverter` functions.
*   **Conversion Logic Reference**: When implementing or modifying the conversion process, refer to the `SpriteStudio-SDK` submodule. The conversion behavior and options should strictly conform to how the `ssconverter-cli` (inside the SDK) operates, as it is the reference implementation.

### Testing
*   Frontend unit tests use Vitest (jsdom); run them with `pnpm test`. Keep framework-free logic in `src/utils.ts` so it stays testable without Tauri.
*   The Rust/Tauri layer needs the `SpriteStudio-SDK` submodule to compile and is exercised by running the app, not by unit tests.

### Versioning
*   `package.json`'s `version` drives the app/bundle version: `tauri.conf.json` reads it via `"version": "../package.json"`, and the `get_versions` command surfaces it at runtime. Keep `src-tauri/Cargo.toml`'s crate `version` in sync when bumping.
*   Record user-facing changes in `CHANGELOG.md` (Keep a Changelog + SemVer). Releases run from the manual `Release` workflow (`.github/workflows/release.yml`).

### Documentation
*   The docs site is **MkDocs + Material**, matching the sibling repos (`SpriteStudio-Docs`, `SSPlayerForGodot`, `SSPlayerForUnity`, `SSPlayerForRenPy`). Config is `mkdocs.yml`; sources are under `docs/`.
*   **Folder-based i18n** (`mkdocs-static-i18n`, `docs_structure: folder`). Every page exists twice: `docs/en/<path>` and `docs/ja/<path>`. When you add, move, or rename a page, do it in **both** locales, or the strict build breaks. English is the default/fallback locale.
*   **Navigation is defined once** in `mkdocs.yml` under `nav:` using locale-relative paths (e.g. `usage.md`, no `en/` or `ja/` prefix). Japanese nav labels come from the `plugins.i18n.languages` → `nav_translations` map, **not** from the file tree — add a matching `nav_translations` entry whenever you introduce a new nav title.
*   **Internal links are relative file paths** ending in `.md` (e.g. `install.md`), which is what `--strict` validates. Links to other repos' docs are absolute `https://…` URLs.
*   **Pinned toolchain**: `docs/requirements.txt` versions are deliberately pinned and kept in sync with the sibling repos. Bump intentionally.
*   The **README is an entry point, not a duplicate** of the site: it carries the feature list, a quick start, and links into `docs/`. Detailed walkthroughs belong in `docs/`, not the README.
*   Always validate with `.venv/bin/mkdocs build --strict` before finishing — CI (`.github/workflows/pages.yml`) runs the same command on every PR touching `docs/` and blocks merge on any broken internal link or nav mismatch.
*   **Publishing is tied to releases**: the site deploys when a GitHub Release is published, or from a manual `workflow_dispatch` run. Merging to `main` does **not** publish — the site documents the released application, so it intentionally tracks releases rather than every merge.

    ```bash
    # macOS / Linux (bash)
    python3 -m venv .venv
    .venv/bin/python -m pip install -r docs/requirements.txt

    .venv/bin/mkdocs serve           # live preview at http://127.0.0.1:8000
    .venv/bin/mkdocs build --strict  # exactly what CI runs
    ```

    ```powershell
    # Windows (PowerShell)
    py -m venv .venv
    .\.venv\Scripts\python -m pip install -r docs/requirements.txt

    .\.venv\Scripts\mkdocs serve           # live preview at http://127.0.0.1:8000
    .\.venv\Scripts\mkdocs build --strict  # exactly what CI runs
    ```

### Running & Building
*   **Prerequisites**: Node.js (v26+), `pnpm`, and the Rust toolchain (`rustup`). Clone with `--recursive` to fetch the `SpriteStudio-SDK` submodule.
*   Start the development server with: `pnpm run tauri dev`.
*   Build the application with: `pnpm run tauri build`.
