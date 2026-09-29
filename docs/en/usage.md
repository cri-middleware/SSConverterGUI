# ▶️ Usage

This page walks through a conversion from start to finish. If you have not installed the
application yet, see [Installation](install.md).

## Converting a project

1. Launch the application.
2. Drag and drop a `.sspj` file, or a folder containing `.sspj` files, into the
   **"📥 Target .sspj File or Folder"** area. Alternatively, use the **"File..."** or
   **"Folder..."** buttons to browse. One item per drop: the outlined box tells you where the
   drop will land, and anything past the first is reported and ignored.
3. *(Optional)* Specify a different output folder in the **"📤 Output Directory"** area, with
   **"Browse..."** or by dropping a folder onto it. Left empty, the output goes next to the
   original `.sspj`, into a `<name>/` folder — or `<name>_emb/` when step 4 is checked, so an
   embedded build never overwrites a plain one. The field's placeholder shows the folder that
   will be used. A folder you choose here stays for the next project you select, so you can set it
   once and convert several in turn; **"Clear"** goes back to the default. Selecting a folder in
   step 2 clears it and switches this area off: a batch writes each project
   next to its own `.sspj`, so there is no single folder to name.
4. *(Optional)* Check the **"Embedded Assets"** box to embed assets in the binary.
5. Click the **"⚡ Convert"** button to start the conversion.
6. While it runs, a bar counts the projects off — `12 / 50` — over the log of what each one is
   doing. When it finishes, the window turns into the **result**: the headline says what happened,
   every project that failed is listed with its full path and the converter's reason, and a scan
   that stopped early is listed as a warning. **"📂 Reveal Output"** opens the folder the converter
   wrote to: for one project that folder, for a batch the folder you selected, since a batch spreads
   its output through it. Close the result with **"Close"** or Esc; the badge beside the button
   keeps the status, and **"📂 Reveal Output"** stays there too. **"Stop / Cancel"** ends the run at
   the file in flight and shows no result, only a `Cancelled` badge.

## Batch conversion

Selecting a folder in step 2 converts every `.sspj` file inside it in one run — there is no need
to add the files one by one.

## Conversion history

Each run is kept as **one entry**, under whatever you selected: a `.sspj` for a single conversion,
the folder for a batch. Re-running one repeats it with the settings it used, without selecting the
input and output again. The line under the path says what those settings were and when it last
ran.

## Keyboard

| Keys (Windows / macOS) | Does |
|---|---|
| `Ctrl+O` / `⌘O` | Choose a `.sspj`, like **File...** |
| `Ctrl+Shift+O` / `⇧⌘O` | Choose a folder, like **Folder...** |
| `Ctrl+Enter` / `⌘Enter` | Convert |

Once an input is chosen, focus moves to **Convert**, so Enter starts the run. While a run is going,
the progress dialog holds the keyboard: Tab stays inside it, and Esc does not stop the run — use
**Stop / Cancel**. Once the result is showing, Esc closes it like **Close** does.

## Appearance

The button at the top right sets the theme. By default the application follows the system's light
or dark setting. Each click steps to light, then dark, then back to following the system, and the
icon shows which is in effect: 🖥️ system, ☀️ light, 🌙 dark. The choice is remembered.
