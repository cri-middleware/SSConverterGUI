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

## 🛠️ Tech Stack

- [Tauri v2](https://v2.tauri.app/) (Rust) - Application framework & backend
- [Vite](https://vitejs.dev/) - Frontend build tool
- [TypeScript](https://www.typescriptlang.org/) / HTML / Vanilla CSS - Frontend UI
- [SpriteStudio7-SDK](https://github.com/SpriteStudio/SpriteStudio7-SDK) (`ssconverter` Rust crate) - Core conversion logic

## ⚙️ Prerequisites

To build and run this project, you need the following environment:

- **Node.js**: `v18` or higher recommended
- **Rust Toolchain**: `cargo`, `rustc`
- Ensure you have met the [Prerequisites](https://v2.tauri.app/start/prerequisites/) for Tauri v2 on your specific OS (e.g., C++ Build Tools on Windows, Xcode Command Line Tools on macOS, required libraries on Linux).

## 🚀 Installation and Execution

1. **Clone the repository and submodules**
   This project uses `SpriteStudio7-SDK` as a submodule. Be sure to clone with the `--recursive` flag, or update submodules after cloning.
   ```bash
   git clone --recursive <repository-url>
   cd SsConverterGUI
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Run in Development Mode**
   ```bash
   pnpm run tauri dev
   # or
   pnpm tauri dev
   ```

4. **Build the Application**
   This will generate a standalone executable.
   ```bash
   pnpm run tauri build
   ```
   The built application will be located in the `src-tauri/target/release/bundle/` directory.

## 💡 Usage

1. Launch the application.
2. Drag and drop a `.sspj` file or a folder containing `.sspj` files into the **"📥 Target .sspj File or Folder"** area. (Alternatively, use the "File..." or "Folder..." buttons to browse).
3. *(Optional)* Specify a different output folder in the **"📤 Output Directory"** area. If left empty, the `.ssab` file will be created next to the original `.sspj` file.
4. *(Optional)* Check the **"Embedded Assets"** box if you want to embed assets in the binary.
5. Click the **"⚡ Convert"** button to start the conversion process.
6. Check the status and logs at the bottom of the screen.

## 📄 License

Please refer to the repository's license and the license of the SpriteStudio7-SDK for usage terms and conditions.
