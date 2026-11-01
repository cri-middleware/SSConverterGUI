# 🖥️ SSConverter GUI

A cross-platform **desktop application** for converting SpriteStudio project files (`.sspj`) into
the binaries a player loads — `.ssab` for animations and `.ssqb` for sequences. No command-line
knowledge is required.

## ✨ Features

- **The same conversion every player runs.** A window around the SDK's `ssconverter` — the
  conversion `ssconverter-cli` and the players' own importers run — so the `.ssab` and `.ssqb` it
  writes load in every official player.
- **A file or a whole folder, by drag and drop.** Drop a `.sspj`, or a folder to convert every
  project under it in one run, with no command line. A project that fails is listed with its full
  path and the converter's reason, and never discards the rest of the batch.
- **Output where you want it.** By default a folder named after the project, next to its `.sspj` —
  `<name>_emb/` for an embedded build, so it never overwrites a plain one — or a folder you choose,
  kept for the next project. **📂 Reveal Output** opens it.
- **Embedded or referenced textures.** One self-contained file, or the textures left beside it,
  replaceable and shared between packs.
- **A run you can watch and stop.** A bar counts the projects off over the converter's log, and
  **Stop / Cancel** ends the run at the file in flight, keeping what finished. **Copy** puts the
  result — failures, warnings and versions — on the clipboard for a bug report or an AI assistant.
- **Re-run from history.** Each run is kept with its settings, so converting a project again after
  editing it needs nothing chosen again.

## Which converter should I use?

Three converters wrap the same `libssconverter` core and produce the same `.ssab` output. Pick the
one that fits your workflow:

| Tool | Use it when |
|---|---|
| **SSConverter GUI** (this app) | You want drag & drop, folder-wide batch conversion, and no command line. |
| [`ssconverter-cli`](https://github.com/cri-middleware/SpriteStudio-SDK/tree/HEAD/cli) | You want to script conversions or run them in CI. |
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
