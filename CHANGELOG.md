# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [7.0.0-beta.1] - Unreleased

### Added
- **Initial Public Release**: Cross-platform GUI application (Tauri v2) for converting SpriteStudio projects (`.sspj`) to `.ssab` (animations) and `.ssqb` (sequences) binaries.
- **Conversion**: Single-file and batch (folder) conversion with drag & drop, an asset-embedding option, conversion history, and real-time logs.
- **Progress and results**: A bar counting a batch's projects off, a result dialog listing every failed project with its full path and the converter's reason, and **Reveal Output** to open what was written. Stopping a batch keeps the projects that finished before the stop.
- **Everyday use**: Keyboard shortcuts for choosing a file or folder and for converting; a light / dark / follow-the-system theme; the app, converter and `.ssab` / `.ssqb` schema versions in the footer, copyable for a bug report.
- **Distribution**: Portable builds — Windows `.zip` (portable exe, x86_64 and arm64) and macOS universal `.tar.gz` (signed & notarized).
- **Documentation**: Bilingual (EN/JA) README and documentation site.

[7.0.0-beta.1]: https://github.com/cri-middleware/SSConverterGUI/releases/tag/v7.0.0-beta.1
