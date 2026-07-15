[**English**](./README.md) | [**日本語**](./README.ja.md)

# SSConverter GUI

A cross-platform GUI application for converting SpriteStudio project files (`.sspj`) to binary formats (`.ssab`).
Built with Tauri v2, Vite, and TypeScript, it provides an intuitive interface for efficient conversions.

## ✨ Features

- **Simple Conversion**: Just select a `.sspj` file and click convert directly from the GUI.
- **Drag & Drop Support**: Drag and drop files or folders directly into the application window.
- **Batch Conversion**: Select a folder to batch convert all `.sspj` files within it.
- **Embedded Assets**: Supports the option to embed assets directly during conversion.
- **Conversion History**: Quickly re-run previous conversions from your history.
- **Real-time Logs**: View progress and error logs in real-time.

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

- [**Documentation (English)**](./docs/en/index.md)
- [**ドキュメント (日本語)**](./docs/ja/index.md)

### Quick Links (English)

- [Installation](./docs/en/install.md)
- [Usage](./docs/en/usage.md)
- [Development](./docs/en/development.md)

## 🚀 Quick Start

1. **Download**: Get the latest executable for your OS from [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) and run it.
2. **Select**: Drag & drop a `.sspj` file — or a folder containing several — into the target area.
3. **Convert**: Click the **"⚡ Convert"** button, then check the status and logs at the bottom of the screen.

For the full walkthrough, including output folders and asset embedding, see the [Usage Guide](./docs/en/usage.md).

## 🛠️ Building from Source

This project uses `SpriteStudio-SDK` as a submodule for the core conversion logic, so clone with `--recursive`.
It requires Node.js (v26+), `pnpm`, and the Rust toolchain.

```bash
git clone --recursive https://github.com/cri-middleware/SSConverterGUI.git
cd SSConverterGUI
pnpm install
pnpm run tauri dev
```

For prerequisites, the tech stack, and build instructions, see the [Development Guide](./docs/en/development.md).

## 🔗 Related Repositories

- [SpriteStudio Docs](https://github.com/cri-middleware/SpriteStudio-Docs) — the documentation portal for the SDK and its official players
- [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) — the SDK itself, providing the `ssconverter` crate

## 📄 License

This repository is licensed under the terms of the [LICENSE.md](./LICENSE.md) (BSD-3-Clause).

Please refer to the license of the included `SpriteStudio-SDK` submodule for its specific usage terms and conditions.
