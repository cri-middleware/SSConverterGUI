# 🖥️ SSConverter GUI

A cross-platform **desktop application** for converting SpriteStudio project files (`.sspj`) into
binary format (`.ssab`). Built with Tauri v2, Vite, and TypeScript, it provides an intuitive
interface for efficient conversions — no command-line knowledge required.

## ✨ Features

- **Simple Conversion**: Just select a `.sspj` file and click convert directly from the GUI.
- **Drag & Drop Support**: Drag and drop files or folders directly into the application window.
- **Batch Conversion**: Select a folder to batch convert all `.sspj` files within it.
- **Embedded Assets**: Supports the option to embed assets directly during conversion.
- **Conversion History**: Quickly re-run previous conversions from your history.
- **Real-time Logs**: View progress and error logs in real-time.

## Which converter should I use?

Three converters wrap the same `libssconverter` core and produce the same `.ssab` output. Pick the
one that fits your workflow:

| Tool | Use it when |
|---|---|
| **SSConverter GUI** (this app) | You want drag & drop, folder-wide batch conversion, and no command line. |
| [`ssconverter-cli`](https://github.com/cri-middleware/SpriteStudio-SDK/tree/main/cli) | You want to script conversions or run them in CI. |
| [`ssconverter-web`](https://cri-middleware.github.io/SSPlayerForWeb/ssconverter/) | You want a one-off conversion in the browser with nothing to install. |

## Next steps

- [Installation](install.md) — download and launch the application.
- [Usage](usage.md) — convert your first `.sspj` file.
- [Limitations & Scope](limitations.md) — what it converts, and what it leaves to the players.
- [Development](development.md) — build the application from source.

## Related links

- [SpriteStudio Docs](https://cri-middleware.github.io/SpriteStudio-Docs/) — the documentation
  portal for the SDK and its official players.
- [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) — the SDK itself,
  providing the `ssconverter` crate this application wraps.
