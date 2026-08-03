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

### 5. リリース用アーカイブのビルド（任意）

`pnpm run tauri build` で得られるのは実行ファイル単体です。リリース時に実際にアップロードされるもの
—— 同じアーカイブ名・同じ構成で、`LICENSE.md` と `THIRD_PARTY_NOTICES.md` を同梱したもの —— を手元で
再現するには、リリーススクリプトを使用してください。`.github/workflows/release.yml` の手順をそのまま
なぞっているため、リリースを実行しなくてもパッケージングやクロスコンパイルの問題を検出できます。

```bash
# macOS（ユニバーサル: Apple シリコン + Intel）
scripts/release-macos.sh
```

```powershell
# Windows x64（ホストビルド）
./scripts/release-windows.ps1

# Windows arm64（CI と同じく x64 ホストからクロスコンパイル）
./scripts/release-windows.ps1 -Arch arm64
```

アーカイブは `dist-release/`（git 管理外）に出力されます。

- **ライセンス表記**: [cargo-about](https://github.com/EmbarkStudios/cargo-about) で生成します
  (`cargo install cargo-about`)。`--skip-notices` / `-SkipNotices` を渡すとこの手順を省略でき、
  素早く確認できますが、アーカイブの内容はリリース版と異なります。
- **Windows arm64**: Visual Studio インストーラーの **MSVC v143 - VS 2022 C++ ARM64 build tools**
  コンポーネントが必要です。Rust のターゲット追加はスクリプトが行います。生成物はビルドした x64 ホスト
  上では実行できないため、動作確認は Arm 実機で行ってください。
- **macOS の署名・公証**: 任意です。ワークフローと同じ環境変数で制御します。`APPLE_SIGNING_IDENTITY`
  を設定すると署名し、さらに `APPLE_API_KEY` / `APPLE_API_ISSUER` と、`APPLE_API_KEY_PATH` または
  `APPLE_API_KEY_BASE64` のいずれかを設定すると公証と staple まで行います。その後スクリプトは完成した
  `.app` を実際に検査し、指定したはずの処理が行われていなければ **エラーで終了** します（証明書の失効や
  設定漏れがあると、署名は黙って何もしないまま通過してしまうためです）。いずれも設定しなければ未署名の
  アプリが生成され、その旨が表示されるだけです。CI と異なり `APPLE_CERTIFICATE` からの取り込みは行わない
  ため、証明書は事前にキーチェーンへ登録しておく必要があります
  (`security find-identity -v -p codesigning`)。

## 📚 ドキュメントのビルド

本サイトは [MkDocs](https://www.mkdocs.org/) と [Material](https://squidfunk.github.io/mkdocs-material/)
テーマで構築されており、他の SpriteStudio Player リポジトリと同じ構成です。ソースは `docs/en/` と
`docs/ja/` にあります。

### macOS / Linux (bash)

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r docs/requirements.txt

.venv/bin/mkdocs serve           # http://127.0.0.1:8000 でライブプレビュー
.venv/bin/mkdocs build --strict  # CI と同一。リンク切れや nav の不整合で失敗する
```

### Windows (PowerShell)

```powershell
py -m venv .venv
.\.venv\Scripts\python -m pip install -r docs/requirements.txt

.\.venv\Scripts\mkdocs serve           # http://127.0.0.1:8000 でライブプレビュー
.\.venv\Scripts\mkdocs build --strict  # CI と同一。リンク切れや nav の不整合で失敗する
```

すべてのページは `docs/en/` と `docs/ja/` に 1 つずつ存在します。ページを追加・移動・リネームする際は
**両方のロケール**で行い、`mkdocs.yml` の `nav_translations` にも対応するエントリを追加してください。
どちらかが欠けると strict ビルドが失敗します。
