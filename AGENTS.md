# SSConverter GUI — AI Agent Guide

## Operating rules

*   Keep changes scoped to the requested task.
*   Do not commit, push, or open PRs unless the user explicitly asks.
*   Before editing, read enough surrounding context to understand callers and invariants; if the
    read tool truncated the file, read the remaining ranges first.
*   Follow existing code style in touched files (naming, type usage, control flow, error handling).
*   Validate with `pnpm test` and, for anything under `docs/`, the both-locale build in the
    [Development guide](./docs/en/development.md). Nothing builds the docs on a pull request, so
    that local build is the only gate.
*   **Update every language of a document together.** `README.md` pairs with `README.ja.md`; the
    other root documents carry an English section followed by a Japanese one; the site pairs
    `docs/en/<path>` with `docs/ja/<path>`.

## What this repo is

A cross-platform desktop application, built with Tauri v2, that converts SpriteStudio `.sspj`
projects to `.ssab` binaries. The frontend is Vite plus vanilla TypeScript in `src/`; the backend
is Rust in `src-tauri/`; the conversion itself comes from the `ssconverter` crate in the
`SpriteStudio-SDK` submodule.

| File | Role |
|---|---|
| `src/main.ts` | All UI wiring: selection, drag-and-drop, history, the progress modal, `invoke`. |
| `src/utils.ts` | Framework-free history logic, unit-tested in `src/utils.test.ts`. |
| `src-tauri/src/lib.rs` | The Tauri commands: `convert_sspj`, `cancel_conversion`, `get_versions`, `path_kind`. |
| `src-tauri/tauri.conf.json`, `capabilities/default.json` | App and window config, and the granted permission set. |

## Where each answer is written

| Question | File |
|---|---|
| What the app does, and how to install it | [README.md](./README.md), the [docs site](./docs/en/) |
| How to set up, run, build and document it | [Development guide](./docs/en/development.md), [CONTRIBUTING.md](./CONTRIBUTING.md) |
| How a release is cut and signed | [RELEASING.md](./RELEASING.md), maintainers only |
| What the app does not do | [docs/en/limitations.md](./docs/en/limitations.md) |
| What each script does and takes | that script's `--help` |
| User-facing changes | [CHANGELOG.md](./CHANGELOG.md) (Keep a Changelog + SemVer) |

Do not restate those here. This file is for what an agent would otherwise break silently.

## Invariants

*   **`ssconverter-cli` is the reference implementation.** Conversion behaviour and options must
    match how the CLI in the SDK submodule behaves; where they differ, the CLI is right.
*   **Keep framework-free logic in `src/utils.ts`**, so it stays testable without Tauri. The
    Rust and Tauri layer is exercised by running the app, not by unit tests.
*   **No heavy frontend framework.** The UI is vanilla TypeScript over the DOM in `src/main.ts`
    and vanilla CSS in `src/style.css`; talk to the backend through `@tauri-apps/api/core`.
*   **Three versions move together**: `package.json`'s `version` drives the app and bundle version
    (`tauri.conf.json` reads it, `get_versions` surfaces it), `src-tauri/Cargo.toml`'s crate
    `version` must match it, and so must the release tag.
*   **A new backend capability needs its permission.** `src-tauri/capabilities/default.json` is
    the granted set; a command that reaches beyond it fails at runtime, not at build time.
*   **Every page exists twice**, `docs/en/<path>` and `docs/ja/<path>`, with the two `nav` trees
    structurally identical and only the labels translated. There is no fallback locale, so a page
    missing from one side is a nav entry pointing at nothing. Internal links are relative `.md`
    paths, which is what `--strict` validates; links into other repositories are absolute URLs.
*   **`docs/requirements.txt` pins `zensical`**, in step with the sibling repositories. Bump
    deliberately, not incidentally.
*   **The README is an entry point, not a duplicate** of the site: the feature list, a quick start,
    and links into `docs/`. Detailed walkthroughs belong in `docs/`.
