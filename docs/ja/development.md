# 開発者向け

このページは、GUI やアプリケーションの機能（Tauri）、およびコアとなる変換ロジック
(`libssconverter` Rust クレート) の開発を行いたい方向けです。アプリケーションを使うだけの場合は、
[インストール](install.md)を参照してください。

## 🛠️ 技術スタック

- **バックエンド / フレームワーク**: [Tauri v2](https://v2.tauri.app/) (Rust)
- **フロントエンド**: [Vite](https://vitejs.dev/)
- **UI 実装**: TypeScript / HTML / Vanilla CSS（重量級のフレームワークは使用していません）
- **コア変換ロジック**: [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK)
  (`ssconverter` Rust クレート)

## ⚙️ 開発環境の要件

ソースコードからアプリケーションをビルドするには、以下の環境が必要です。

- **Node.js**: `v26` 以上を推奨。パッケージマネージャーとして `pnpm` を使用します。未インストールの
  場合は、あらかじめ `npm install -g pnpm`（または `corepack enable pnpm`）を実行してください。
- **Rust ツールチェーン**: [rustup](https://rustup.rs/) を経由したインストール。
- ご利用の OS における Tauri v2 の[前提条件 (Prerequisites)](https://v2.tauri.app/start/prerequisites/)
  を満たしていること（Windows なら C++ Build Tools、macOS なら Xcode Command Line Tools、Linux なら
  必要なライブラリ）。

## 🚀 セットアップと実行手順

### 1. リポジトリとサブモジュールのクローン

変換のコア機能として `SpriteStudio-SDK` をサブモジュールとして使用しています。クローンする際は必ず
`--recursive` フラグを使用してください。

```bash
git clone --recursive https://github.com/cri-middleware/SSConverterGUI.git
cd SSConverterGUI
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 開発モードでの起動

Rust によるコアロジックのビルドを含め、変更をリアルタイムに検知する開発サーバーを立ち上げて GUI を
起動します。

```bash
pnpm run tauri dev
```

### 4. アプリケーションのビルド

配布用のスタンドアロンな実行ファイルを生成します。

```bash
pnpm run tauri build
```

## 📚 ドキュメントのビルド

本サイトは [MkDocs](https://www.mkdocs.org/) と [Material](https://squidfunk.github.io/mkdocs-material/)
テーマで構築されており、他の SpriteStudio Player リポジトリと同じ構成です。ソースは `docs/en/` と
`docs/ja/` にあります。

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r docs/requirements.txt

mkdocs serve           # http://127.0.0.1:8000 でライブプレビュー
mkdocs build --strict  # CI と同一。リンク切れや nav の不整合で失敗する
```

すべてのページは `docs/en/` と `docs/ja/` に 1 つずつ存在します。ページを追加・移動・リネームする際は
**両方のロケール**で行い、`mkdocs.yml` の `nav_translations` にも対応するエントリを追加してください。
どちらかが欠けると strict ビルドが失敗します。
