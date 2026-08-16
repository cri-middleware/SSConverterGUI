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

Built with [Zensical](https://zensical.org), the successor to MkDocs + Material for MkDocs. Zensical has no multi-locale build, so **each locale is built from its own config**: `mkdocs.yml` builds `docs/en` to `site/`, `mkdocs.ja.yml` builds `docs/ja` to `site/ja/`, and both inherit the shared settings from `mkdocs.base.yml`. Every page still exists as both `docs/en/<path>` and `docs/ja/<path>`; there is no fallback locale any more, so a page missing from one side is a nav entry pointing at nothing.

**The three-config split has one rule: a YAML sequence must be defined in exactly one of the three files.** Zensical's `INHERIT` *concatenates* parent and child sequences where MkDocs replaces them — put `nav` in the base as well as a locale config and the Japanese site renders the English navigation followed by the Japanese one. Shared sequences (`theme.palette`, `theme.features`, `plugins`, `markdown_extensions`, `extra.alternate`) live in `mkdocs.base.yml` and nowhere else; `nav` and `extra.social` live in the locale configs and never in the base.

Things that do **not** follow the "everything twice" rule, or that changed with the migration — check before duplicating:

*   **`overrides/main.html`** (`theme.custom_dir`) emits the Open Graph / Twitter Card tags the theme omits, **and repairs the page title**: Zensical never sets `page.is_homepage`, which its own `base.html` branches on, so the landing page would title itself "SSConverter GUI - SSConverter GUI". The override derives the flag from `page.url` and overrides the `htmltitle` block. **One template serves both locales** — everything is read from whichever locale config is building. Localize by adding a per-locale config override, never by branching in the template. Keep it in sync with the copies in SpriteStudio-Docs and the sibling player repos.
*   **`overrides/partials/alternate.html`** rebuilds the header language selector so switching language keeps you on the same page. `mkdocs-static-i18n` used to rewrite those links per page; nothing does once the locales are separate builds, and the stock partial would send every reader to the other locale's home page. Driven by `extra.alternate[].link` (a locale subpath, not a URL) plus `extra.site_root_prefix` in each locale config — which also means the links are relative now, rather than hard-coding the `/SSConverterGUI/` prefix. Known gap: the `<link rel="alternate" hreflang>` tags in `<head>` still point at each locale root, because they sit inside the theme's `site_meta` block.
*   **`site_url` is per locale** and the ja one keeps its `ja/` suffix — `page.canonical_url`, and therefore `og:url`, is built from it.
*   **Footer social icons are defined twice** — in `mkdocs.yml` and `mkdocs.ja.yml` (translated labels, same icons and links). Add or reorder an icon in both, or the two footers diverge. Keep `twitter:site` in `overrides/main.html` in sync with the X link.
*   **There is deliberately no `edit_uri`**, so no "edit this page" button renders. It is a branch name nothing validates, and it had drifted wrong in three of the five player repos. Do not reintroduce it.

`mkdocs.base.yml` sets `strict: true`, so a plain `build` fails on a broken link. `serve` validates nothing — `zensical serve --strict` is accepted and currently does nothing. Nothing builds the docs on a pull request — `pages.yml` runs on `release: published` and dispatch — so the local build is the only gate, and **both locales have to be built**, English first because it clears `site/`, which contains `site/ja`.

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
*   The docs site is **Zensical**, matching the sibling repos (`SpriteStudio-Docs`, `SSPlayerForGodot`, `SSPlayerForUnity`, `SSPlayerForRenPy`, `SSPlayerForFlutter`). Configs are `mkdocs.base.yml` plus one per locale; sources are under `docs/`. See §Documentation site above for the split and the rule that governs it.
*   **One locale, one config.** Every page exists twice: `docs/en/<path>` and `docs/ja/<path>`. When you add, move, or rename a page, do it in **both** locales. There is no fallback locale, so a missing page is a nav entry pointing at nothing.
*   **Navigation is defined twice**, once per locale config, using locale-relative paths (e.g. `usage.md`, no `en/` or `ja/` prefix). The two trees must stay structurally identical; only the labels differ, written directly in each language. `nav_translations` no longer exists.
*   **Internal links are relative file paths** ending in `.md` (e.g. `install.md`), which is what `--strict` validates. Links to other repos' docs are absolute `https://…` URLs.
*   **Pinned toolchain**: `docs/requirements.txt` pins `zensical` deliberately, in step with the sibling repos. Bump intentionally.
*   The **README is an entry point, not a duplicate** of the site: it carries the feature list, a quick start, and links into `docs/`. Detailed walkthroughs belong in `docs/`, not the README.
*   Always validate with **both** locale builds before finishing. Nothing builds the docs on a pull request — `pages.yml` runs on `release: published` and dispatch only — so a broken internal link would otherwise surface at deploy time, not at review time.
*   **Publishing is tied to releases**: the site deploys when a GitHub Release is published, or from a manual `workflow_dispatch` run. Merging to `main` does **not** publish — the site documents the released application, so it intentionally tracks releases rather than every merge.

    ```bash
    # macOS / Linux (bash)
    scripts/prepare-docs.sh                             # once: .venv + docs/requirements.txt
    scripts/build-docs.sh                               # the gate: both locales, both --strict
    scripts/build-pages.sh serve=yes                    # ... the published tree, on :8000

    .venv/bin/zensical serve                            # live preview of English
    .venv/bin/zensical serve -f mkdocs.ja.yml           # ... or of Japanese
    ```

    ```powershell
    # Windows (PowerShell)
    scripts\prepare-docs.ps1
    scripts\build-docs.ps1

    .\.venv\Scripts\zensical serve                      # live preview of English
    .\.venv\Scripts\zensical serve -f mkdocs.ja.yml     # ... or of Japanese
    ```

    `build-docs` owns the order — English first, because it clears `site/`, which contains
    `site/ja`. All three scripts take `key=value` options and `--help` (`build-docs.sh
    locale=ja`, `prepare-docs.sh force=yes`), and the first two wrap nothing more than
    `pip install -r` and the two `zensical build` runs. `serve` is deliberately not wrapped:
    it validates nothing and serves one locale at a time. Every repository in the family
    spells this pair the same way, and the `-docs` suffix keeps it apart from the scripts
    that build the app.

    `build-pages` is the third: the published site, which here is the docs and nothing else
    — the pair above run for you, then a static server over `site/`. That server is the
    point of it, and the one thing `zensical serve` cannot do: both locales at once, so the
    header language selector resolves. `pages.yml`'s build job **is** this script
    (`prepare=no serve=no`, every option spelled out so a publish cannot change because a
    default did), so CI and the local gate cannot drift, and the name means the same thing
    in every repository in the family — including the ones whose site carries a demo or an
    API reference as well.

### Running & Building
*   **Prerequisites**: Node.js (v26+), `pnpm`, and the Rust toolchain (`rustup`). Clone with `--recursive` to fetch the `SpriteStudio-SDK` submodule.
*   Start the development server with: `pnpm run tauri dev`.
*   Build the application with: `pnpm run tauri build`.
