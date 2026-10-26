[**English**](./README.md) | [**日本語**](./README.ja.md)

# SSConverter GUI

A cross-platform GUI application for converting SpriteStudio project files (`.sspj`) into the binaries a player loads — **`.ssab`** for animations and **`.ssqb`** for sequences.
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

- [**Documentation site (hosted)**](https://cri-middleware.github.io/SSConverterGUI/)
- [**Documentation (English)**](./docs/en/index.md)
- [**ドキュメント (日本語)**](./docs/ja/index.md)
- [**For AI assistants**](https://cri-middleware.github.io/SSConverterGUI/llms.txt) — these docs as Markdown: `llms.txt` indexes the pages and `llms-full.txt` holds all of them in one file
- [**SpriteStudio Docs (portal)**](https://cri-middleware.github.io/SpriteStudio-Docs/) — the SDK and every official player in one place

### Quick Links (English)

- [Installation](./docs/en/install.md)
- [Usage](./docs/en/usage.md)
- [Limitations & Scope](./docs/en/limitations.md)
- [Development](./docs/en/development.md)

## 🚀 Quick Start

**Converting your projects?** Read on — download, drop a `.sspj` in, convert.
**Working on SSConverter GUI itself?** [Building from Source](#%EF%B8%8F-building-from-source) below.

Requires **macOS 10.15+** (universal) or **Windows 10/11** (x86_64 and Arm builds). Every build is portable — no installer. Projects have to be authored in **SpriteStudio 7.6 or later**, which is what the `.ssab` / `.ssqb` formats are defined against.

1. **Download**: Get the archive for your OS and CPU from [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) — `SSConverterGUI_<version>_universal.tar.gz` on macOS, `SSConverterGUI_<version>_x86_64.zip` or `…_arm64.zip` on Windows — unpack it, and run it. The Windows `.exe` is unsigned, so SmartScreen prompts on first launch — see the [Installation Guide](./docs/en/install.md).
2. **Select**: Drag & drop a `.sspj` file — or a folder containing several — onto the **"📥 Target .sspj File or Folder"** area.
3. **Convert**: Click the **"⚡ Convert"** button. The badge beside it gives the status, and the log below reports each project. The output is a folder named after the project, next to its `.sspj` (`<name>_emb/` with **Embedded Assets** checked); **"📂 Reveal Output"** opens it.

   ```
   Ringo/                 ← your SpriteStudio project
   ├── Ringo.sspj         ← drop this
   ├── Ringo.png
   ├── …
   └── Ringo/             ← written by ⚡ Convert
       ├── Ringo.ssab
       ├── Ringo.png
       └── …
   ```

Copy that output folder to where your player loads assets from; each player's Quick Start shows where — start from [Choose Your Platform](https://cri-middleware.github.io/SpriteStudio-Docs/overview/choose-your-platform/).

No `.sspj` of your own yet? SpriteStudio's [official sample data](https://www.webtech.co.jp/help/ja/spritestudio7/download/sample/) works as-is — the page is in Japanese, the downloads are not. [Ringo](https://www.webtech.co.jp/help/ja/spritestudio7/download/sample/#ringo) is a good character to start with.

**Read next:** [Usage](./docs/en/usage.md) · [Installation](./docs/en/install.md) · [Limitations & Scope](./docs/en/limitations.md)

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

What this tool writes is what every official player reads — the same `.ssab` runs on all of them.

- [SpriteStudio Docs](https://cri-middleware.github.io/SpriteStudio-Docs/) — the portal for the SDK and every official player, and where to pick one
- [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) — the SDK itself, providing the `ssconverter` crate this app is built on (`ssconverter-cli` is the same conversion without a GUI)

## 📄 License

This repository is licensed under the terms of the [LICENSE.md](./LICENSE.md) (BSD-3-Clause).

The application statically links its whole Rust dependency graph — Tauri/wry, the `ssconverter` SDK
and their transitive crates — and embeds its frontend bundle and the Inter font, so
**`THIRD_PARTY_NOTICES.md` ships inside every release archive**, next to the executable. It is
generated at release time rather than committed — by `cargo about` for the Rust crates and
`scripts/generate-npm-notices.mjs` for the npm packages and the font — so it always matches the
binary you downloaded; `about.toml` holds the accepted-licence list, and an unlisted licence fails
the release build rather than shipping unnoticed.

The bundled `SpriteStudio-SDK` submodule is BSD-3-Clause, like this repository.
