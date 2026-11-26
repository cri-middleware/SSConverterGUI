[**English**](./README.md) | [**日本語**](./README.ja.md)

# SSConverter GUI

A cross-platform GUI application for converting SpriteStudio project files (`.sspj`) into the binaries a player loads — **`.ssab`** for animations and **`.ssqb`** for sequences.

## ✨ Features

- **The same conversion every player runs.** A window around the SDK's `ssconverter` — the conversion `ssconverter-cli` and the players' own importers run — so the `.ssab` and `.ssqb` it writes load in every official player.
- **A file or a whole folder, by drag and drop.** Drop a `.sspj`, or a folder to convert every project under it in one run, with no command line. A project that fails is listed with its full path and the converter's reason, and never discards the rest of the batch.
- **Output where and how you want it.** By default a folder named after the project, next to its `.sspj` — `<name>_emb/` for an embedded build, so it never overwrites a plain one — or a folder you choose, kept for the next project (**📂 Reveal Output** opens it). Choose one self-contained `.ssab` with the images and sounds embedded, or leave them beside it so they stay replaceable and shared between packs.
- **A run you can watch and stop.** A bar counts the projects off over the converter's log, and **Stop / Cancel** ends the run at the file in flight, keeping what finished. **Copy** puts the result — failures, warnings and versions — on the clipboard for a bug report or an AI assistant.
- **Re-run from history.** Each project or folder is kept with the settings it last ran with, so converting it again after editing needs nothing chosen again.

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

- [**Documentation site (hosted)**](https://cri-middleware.github.io/SSConverterGUI/)
- [**Documentation (English)**](./docs/en/index.md)
- [**ドキュメント (日本語)**](./docs/ja/index.md)
- [**For AI assistants**](https://cri-middleware.github.io/SSConverterGUI/llms.txt) — these docs as Markdown: `llms.txt` indexes the pages and `llms-full.txt` holds all of them in one file
- [**SpriteStudio Docs (portal)**](https://cri-middleware.github.io/SpriteStudio-Docs/) — the SDK and every official player in one place

## 🚀 Quick Start

**Converting your projects?** Read on — download, drop a `.sspj` in, convert.
**Working on SSConverter GUI itself?** [Building from Source](#%EF%B8%8F-building-from-source) below.

Requires **macOS 10.15+** (universal) or **Windows 10/11** (x86_64 and Arm builds). Every build is portable — no installer. SSConverter GUI supports projects authored in **SpriteStudio 7.6 or later**, which is what the `.ssab` / `.ssqb` formats are defined against.

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

No `.sspj` of your own yet? SpriteStudio's [official sample data](https://www.webtech.co.jp/help/ja/spritestudio7/download/sample/) works as-is — the page is in Japanese, the downloads are not. [Ringo](https://www.webtech.co.jp/spritestudio/ss6user/download/OPTPiX_SpriteStudio_Ringo_Sample_20220121.zip) is a good character to start with. To make your own, you use SpriteStudio itself — see [its site](https://www.webtech.co.jp/eng/spritestudio/).

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

For prerequisites, the tech stack, how the app is put together, and build instructions, see the [Development Guide](./docs/en/development.md).

## 🔗 Related Repositories

What this tool writes is what every official player reads — the same `.ssab` runs on all of them.

- [SpriteStudio Docs](https://cri-middleware.github.io/SpriteStudio-Docs/) — the portal for the SDK and every official player, and where to pick one
- [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) — the SDK itself, providing the `ssconverter` crate this app is built on (`ssconverter-cli` is the same conversion without a GUI)

## 📄 License

This repository is licensed under the terms of the [LICENSE.md](./LICENSE.md) (BSD-3-Clause).

The application statically links its whole Rust dependency graph — Tauri/wry, the `ssconverter` SDK
and their transitive crates — and embeds its frontend bundle and the Inter font, so
**`THIRD_PARTY_NOTICES.md` ships inside every release archive**, next to the executable. It is
generated at release time, so it always matches the binary you downloaded.

The bundled `SpriteStudio-SDK` submodule is BSD-3-Clause, like this repository.
