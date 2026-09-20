# ▶️ Usage

This page walks through a conversion from start to finish. If you have not installed the
application yet, see [Installation](install.md).

## Converting a project

1. Launch the application.
2. Drag and drop a `.sspj` file, or a folder containing `.sspj` files, into the
   **"📥 Target .sspj File or Folder"** area. Alternatively, use the **"File..."** or
   **"Folder..."** buttons to browse.
3. *(Optional)* Specify a different output folder in the **"📤 Output Directory"** area. Left
   empty, the output goes next to the original `.sspj`, into a `<name>/` folder — or
   `<name>_emb/` when step 4 is checked, so an embedded build never overwrites a plain one. The
   field's placeholder shows the folder that will be used.
4. *(Optional)* Check the **"Embedded Assets"** box to embed assets in the binary.
5. Click the **"⚡ Convert"** button to start the conversion.
6. Check the status and logs at the bottom of the screen.

## Batch conversion

Selecting a folder in step 2 converts every `.sspj` file inside it in one run — there is no need
to add the files one by one.

## Conversion history

Previous conversions are kept in the history, so you can re-run one with the same settings without
selecting the input and output again.
