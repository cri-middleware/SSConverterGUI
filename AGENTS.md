# SSConverterGUI — AI Agent Guide

## Operating rules

*   **Unrequested hardening is a suggestion, not a commit.** A defect you hit in code you touched is not:
    fix it, or say why you did not.
*   **Anything that exists twice changes twice** — a page and its translation, a `.sh` and its `.ps1`.
    Missing one half is this family's most common defect.
*   **Never break a line between two Japanese characters**; Chrome renders the break as a space.
*   **Finish with this repository's checks**: `pnpm test`, and for anything under `docs/` the both-locale
    build in the [Development guide](./docs/en/development.md). Read what a run says it verified, not its
    exit code — several checks pass, or skip themselves, without a prerequisite.
*   **Do not restate what another file owns**; the table below says which file. A fact no file owns goes
    where its staleness will be noticed.
*   **Never commit inside the `SpriteStudio-SDK` submodule.** A core change is an SDK pull request, then a
    submodule bump here.
*   **`ssconverter-cli` in the submodule is the reference implementation** of conversion behaviour and
    options; where this app differs from it, the CLI is right.

## What this repo is

A Tauri v2 desktop app that converts `.sspj` projects to `.ssab`: Vite and vanilla TypeScript in `src/`,
Rust in `src-tauri/`, and the conversion itself from the submodule's `ssconverter` crate.

## Where each answer is written

| Question | File |
|---|---|
| Use and install | [README.md](./README.md), the [docs site](./docs/en/) |
| Constraints, setup, build, the docs site | [CONTRIBUTING.md](./CONTRIBUTING.md), [Development guide](./docs/en/development.md) |
| Versions, releases and signing, maintainers only | [RELEASING.md](./RELEASING.md) |
| What the app does not do | [docs/en/limitations.md](./docs/en/limitations.md) |
| What a script takes | its `--help` |

## Invariants

*   **Framework-free logic goes in `src/utils.ts`**, the only unit-tested layer; the Rust and Tauri layers
    are exercised by running the app.
*   **A new backend capability needs its permission** in `src-tauri/capabilities/default.json`; a command
    beyond the granted set fails at runtime, not at build time.
