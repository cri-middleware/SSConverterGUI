[**English**](./README.md) | [**日本語**](./README.ja.md)

# SSConverter GUI

A cross-platform GUI application for converting SpriteStudio project files (`.sspj`) to binary formats (`.ssab`).
Built with Tauri v2, Vite, and TypeScript, it provides an intuitive interface for efficient conversions.

---

This documentation is structured for two different personas. Please refer to the section that best matches your goals:

1. **Tool Users**: Those who just want to use the finished GUI application for conversions.
2. **Developers**: Those who want to modify and build the application from source, including the GUI frontend and the core `libssconverter` logic.

---

## 1. Tool Users Guide

This section is for users who want to use the application to convert files. It requires no command-line knowledge.

### ✨ Features

- **Simple Conversion**: Just select a `.sspj` file and click convert directly from the GUI.
- **Drag & Drop Support**: Drag and drop files or folders directly into the application window.
- **Batch Conversion**: Select a folder to batch convert all `.sspj` files within it.
- **Embedded Assets**: Supports the option to embed assets directly during conversion.
- **Conversion History**: Quickly re-run previous conversions from your history.
- **Real-time Logs**: View progress and error logs in real-time.

### 💡 Comparison with Other Converters

There are a few other variations of the SpriteStudio converter. Here is why you might choose this GUI version:

* **vs `ssconverter-cli` (Command-line tool in SpriteStudio-SDK)**
  * **Intuitive Usage**: No command-line knowledge is required. Anyone can easily convert files using Drag & Drop.
  * **Easy Batch Conversion**: Simply select a folder, and it automatically finds and converts all `.sspj` files inside, saving you the trouble of writing shell scripts.
* **vs `ssconverter-web` (Browser-based tool in SSPlayerForWeb)**
  * **Direct File System Access**: Unlike the Web version, you don't need to manually upload and download files through a browser. It directly and rapidly processes your local files.
  * **Built for Large Projects**: It is not constrained by browser memory limits or security sandboxes, delivering stable native performance even for massive projects with numerous assets.

### 📥 Installation

1. Download the latest executable for your OS from the [GitHub Releases](https://github.com/cri-middleware/SsConverterGUI/releases) page.
2. Run the downloaded file to launch the application (no installation required for portable versions).

### 💡 Usage

1. Launch the application.
2. Drag and drop a `.sspj` file or a folder containing `.sspj` files into the **"📥 Target .sspj File or Folder"** area. (Alternatively, use the "File..." or "Folder..." buttons to browse).
3. *(Optional)* Specify a different output folder in the **"📤 Output Directory"** area. If left empty, the `.ssab` file will be created next to the original `.sspj` file.
4. *(Optional)* Check the **"Embedded Assets"** box if you want to embed assets in the binary.
5. Click the **"⚡ Convert"** button to start the conversion process.
6. Check the status and logs at the bottom of the screen.

---

## 2. Developers Guide

This section is for developers who want to modify and build the entire application from source, including the GUI frontend and the core `libssconverter` logic via the Rust backend.

### 🛠️ Tech Stack

- **Application Framework & Backend**: [Tauri v2](https://v2.tauri.app/) (Rust)
- **Frontend Build Tool**: [Vite](https://vitejs.dev/)
- **Frontend UI**: TypeScript / HTML / Vanilla CSS (No heavy frameworks used)
- **Core Conversion Logic**: [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) (`ssconverter` Rust crate)

### ⚙️ Prerequisites

To build and run this application from source, you need the following environment:

- **Node.js**: `v26` or higher recommended
  - We use `pnpm` as the package manager. If you haven't installed it yet, please run `npm install -g pnpm` (or `corepack enable pnpm`) beforehand.
- **Rust Toolchain**: Installed via [rustup](https://rustup.rs/)
- Ensure you have met the [Prerequisites](https://v2.tauri.app/start/prerequisites/) for Tauri v2 on your specific OS (e.g., C++ Build Tools on Windows, Xcode Command Line Tools on macOS, required libraries on Linux).

### 🚀 Setup and Run

1. **Clone the repository and submodules**
   This project uses `SpriteStudio-SDK` as a submodule for the core logic. Be sure to clone with the `--recursive` flag.
   ```bash
   git clone --recursive https://github.com/cri-middleware/SsConverterGUI.git
   cd SsConverterGUI
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Run in Development Mode**
   This will compile the core logic and launch the GUI with hot-reloading enabled.
   ```bash
   pnpm run tauri dev
   ```

4. **Build the Application**
   This will generate a standalone executable.
   ```bash
   pnpm run tauri build
   ```

## 📄 License

This repository is licensed under the terms of the [LICENSE.md](./LICENSE.md) (BSD-3-Clause).

Please refer to the license of the included `SpriteStudio-SDK` submodule for its specific usage terms and conditions.
