## Operating rules

*   Keep changes scoped to the requested task.
*   Do not commit unless the user explicitly asks.
*   Before editing, read enough surrounding context to understand callers and invariants; if the
    read tool truncated the file, read the remaining ranges before making non-trivial changes.
*   Follow existing code style in touched files (naming, type usage, control flow, error
    handling).

## Project Overview

This is a cross-platform GUI application built with Tauri v2 for converting SpriteStudio (`.sspj`) projects to `.ssab` binaries.

*   **Frontend**: Built with Vite, vanilla TypeScript, HTML, and CSS. Located primarily in the `src/` directory and `index.html`.
*   **Backend**: Built with Rust using the Tauri v2 framework. Located in the `src-tauri/` directory.
*   **Core SDK**: The actual conversion logic relies on the `ssconverter` crate from the `SpriteStudio7-SDK`, which is included as a local Git submodule.

## Development Guidelines

### Frontend
*   The frontend avoids heavy frameworks (like React or Vue) and uses vanilla TypeScript for DOM manipulation in `src/main.ts`.
*   Maintain the existing UI styling approach (vanilla CSS in `src/style.css`).
*   Interact with the Rust backend using `@tauri-apps/api/core` (e.g., `invoke` for commands, `listen` for events).

### Backend (Rust)
*   Tauri commands and backend logic are managed in `src-tauri/src/`.
*   Ensure that any new Rust dependencies are added to `src-tauri/Cargo.toml`.
*   The backend handles file system operations, dialogues, and invokes the `ssconverter` functions.
*   **Conversion Logic Reference**: When implementing or modifying the conversion process, please refer to the `SpriteStudio7-SDK` submodule. The conversion behavior and options should strictly conform to how the `ssconverter-cli` (located inside the SDK) operates, as it serves as the reference implementation.

### Running & Building
*   Start the development server with: `npm run tauri dev`
*   Build the application with: `npm run tauri build`
