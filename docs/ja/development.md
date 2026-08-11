# 🛠️ 開発者向け

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
# macOS（ユニバーサル: Apple Silicon + Intel）
scripts/release-macos.sh
```

```powershell
# Windows x86_64（ホストビルド）
./scripts/release-windows.ps1

# Windows arm64（CI と同じく x86_64 ホストからクロスコンパイル）
./scripts/release-windows.ps1 -Arch arm64
```

アーカイブは `dist-release/`（git 管理外）に出力されます。

- **ライセンス表記**: [cargo-about](https://github.com/EmbarkStudios/cargo-about) で生成します
  (`cargo install cargo-about`)。`--skip-notices` / `-SkipNotices` を渡すとこの手順を省略でき、
  素早く確認できますが、アーカイブの内容はリリース版と異なります。
- **Windows arm64**: Visual Studio インストーラーの **MSVC v143 - VS 2022 C++ ARM64 build tools**
  コンポーネントが必要です。Rust のターゲット追加はスクリプトが行います。生成物はビルドした x86_64 ホスト
  上では実行できないため、動作確認は Arm 実機で行ってください。
- **macOS の署名・公証**: 任意です。ワークフローと同じ環境変数で制御します。`APPLE_SIGNING_IDENTITY`
  を設定すると署名し、さらに `APPLE_API_KEY` / `APPLE_API_ISSUER` と、`APPLE_API_KEY_PATH` または
  `APPLE_API_KEY_BASE64` のいずれかを設定すると公証と staple まで行います。その後スクリプトは完成した
  `.app` を実際に検査し、指定したはずの処理が行われていなければ **エラーで終了** します（証明書の失効や
  設定漏れがあると、署名は黙って何もしないまま通過してしまうためです）。いずれも設定しなければ未署名の
  アプリが生成され、その旨が表示されるだけです。ローカルでは `APPLE_CERTIFICATE` は設定しないでください。
  CI ではこの変数で `.p12` を渡し、Tauri CLI が一時キーチェーンへ取り込みますが、ローカルでは既存の
  キーチェーンから証明書が解決されるためです (`security find-identity -v -p codesigning`)。

## 📚 ドキュメントのビルド

本サイトは MkDocs と Material テーマの後継である [Zensical](https://zensical.org/) で構築されており、
他の SpriteStudio Player リポジトリと同じ構成です。ソースは `docs/en/` と `docs/ja/` にあり、
ビルドは 2 つのスクリプトが受け持ちます。

### macOS / Linux (bash)

```bash
scripts/prepare-docs.sh          # 初回のみ。.venv を作成し docs/requirements.txt を導入
scripts/build-docs.sh            # CI と同一。リンク切れや nav の不整合で失敗する

.venv/bin/zensical serve                   # 英語を http://127.0.0.1:8000 でライブプレビュー
.venv/bin/zensical serve -f mkdocs.ja.yml  # ... または日本語をプレビュー
```

### Windows (PowerShell)

```powershell
scripts\prepare-docs.ps1
scripts\build-docs.ps1

.\.venv\Scripts\zensical serve                   # 英語をライブプレビュー
.\.venv\Scripts\zensical serve -f mkdocs.ja.yml  # ... または日本語をプレビュー
```

いずれのスクリプトも `key=value` 形式のオプションと `--help` を受け付けます
（`build-docs.sh locale=ja`、`prepare-docs.sh force=yes`）。`serve` にスクリプトが無いのは意図的です。
リンクを検証せず、一度に 1 ロケールしか配信しないため、ビルドの代わりにはなりません。

Zensical は **1 ロケールにつき 1 つの設定ファイル** でビルドするため、ビルドはロケールごとに実行され、
`build-docs` はその順序を保証します。英語を先にビルドするのは、英語ビルドが出力先の `site/` を
開始時に消去し、日本語サイトはその内側（`site/ja`）に出力されるためです。英語だけをビルドすると
日本語サイトは残りません。

すべてのページは `docs/en/` と `docs/ja/` に 1 つずつ存在します。ページを追加・移動・リネームする際は
**両方のロケール**で行い、`mkdocs.yml` と `mkdocs.ja.yml` の **両方** の `nav` にもエントリを
追加してください。どちらかが欠けると strict ビルドが失敗します。
