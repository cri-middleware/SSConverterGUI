# Contributing to SSConverter GUI

Thank you for your interest in contributing to SSConverter GUI! We welcome all kinds of contributions, including bug reports, feature requests, documentation improvements, and code contributions.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Environment](#development-environment)
- [Coding Standards](#coding-standards)

## Code of Conduct
Please refer to [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Technical Constraints & Guiding Principles
- **Core Logic Separation:** The actual conversion logic (`ssconverter`) resides in the `SpriteStudio-SDK` submodule. Do not implement complex `.sspj` parsing or binary generation in the GUI repository. All core logic changes must be made in the `SpriteStudio-SDK` repository.
- **Lightweight Frontend:** This project intentionally avoids heavy frontend frameworks (like React or Vue) to keep the application lightweight and fast. Use Vanilla TypeScript and standard DOM APIs for UI development.

### Reporting Bugs
If you find a bug, please check if it relates to the GUI (e.g. file selection, UI glitches) or the actual conversion logic. 
- GUI issues should be reported in this repository.
- Conversion issues (e.g. incorrect binary output, crashes during conversion) should be reported to the `SpriteStudio-SDK` repository.

### Pull Requests
1. Fork the repository.
2. Clone your fork with `--recursive` to ensure the SDK submodule is initialized.
3. Run `pnpm test`, then check your change in the running app with `pnpm run tauri dev`. `pnpm test` covers
   the frontend's helpers only — it reaches neither the Rust backend nor a conversion — so also convert a
   real `.sspj` in the app.
4. Submit a Pull Request.

## Development Environment
Please refer to the [Development Guide](./docs/en/development.md) for detailed prerequisites and setup instructions.

## Coding Standards
- **Frontend**: Use strict TypeScript. Avoid inline styles; use the central `style.css`.
- **Backend (Rust)**: in `src-tauri/`, `cargo fmt --all -- --check` and
  `cargo clippy -p ssconverter-gui --all-targets --locked -- -D warnings` — what CI runs.

<br>
<br>

---

# SSConverter GUI への貢献について

SSConverter GUI にご関心をお寄せいただき、ありがとうございます！ バグ報告、機能提案、ドキュメントの改善、コードの提供など、あらゆる形での貢献を歓迎します。

## 目次
- [行動規範](#行動規範)
- [貢献する方法](#貢献する方法)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [コーディング規約](#コーディング規約)

## 行動規範
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) を参照してください。

## 貢献する方法

### 技術的制約と設計原則
- **コアロジックの分離:** 実際の変換処理アルゴリズム (`ssconverter`) は `SpriteStudio-SDK` サブモジュールに存在します。本リポジトリ（GUI側）で独自の `.sspj` 解析やバイナリ生成は行わないでください。変換ロジックの修正は `SpriteStudio-SDK` 側へPull Requestをお願いします。
- **軽量なフロントエンド:** 本プロジェクトはアプリの軽量化のため、ReactやVueといった重いフロントエンドフレームワークを意図的に避けています。UIの実装には Vanilla TypeScript と標準的な DOM API を使用してください。

### バグの報告
バグを発見した場合は、それがGUIに関する問題（ファイル選択が効かない、UI崩れ等）なのか、変換ロジック自体の問題なのかを切り分けてください。
- GUIの不具合：本リポジトリに報告してください。
- 変換の不具合（出力バイナリがおかしい、変換中にクラッシュする等）：`SpriteStudio-SDK` リポジトリへ報告してください。

### プルリクエスト
1. リポジトリをフォークしてください。
2. サブモジュールを取得するため、必ず `--recursive` オプションを付けてクローンしてください。
3. `pnpm test` を実行し、`pnpm run tauri dev` で起動したアプリで変更を確認してください。`pnpm test` が見るのはフロントエンドの補助関数だけで、Rust バックエンドにも変換処理にも届きません。実際の `.sspj` もアプリで変換してください。
4. プルリクエストを送信してください。

## 開発環境のセットアップ
必要な環境やセットアップ手順については、[開発者向けガイド](./docs/ja/development.md)を参照してください。

## コーディング規約
- **フロントエンド**: Strict な TypeScript を記述してください。インラインスタイルは避け、`style.css` を活用してください。
- **バックエンド (Rust)**: `src-tauri/` で `cargo fmt --all -- --check` と `cargo clippy -p ssconverter-gui --all-targets --locked -- -D warnings` を通してください（CI と同じコマンドです）。
