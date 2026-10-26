[**English**](./README.md) | [**日本語**](./README.ja.md)

# SSConverter GUI

SSConverter GUI は、SpriteStudio のプロジェクトファイル (`.sspj`) を、プレイヤーが読み込むバイナリ —— アニメーションの **`.ssab`** とシーケンスの **`.ssqb`** —— に変換するクロスプラットフォーム対応の GUI アプリケーションです。
Tauri v2、Vite、TypeScript を使用して構築されており、効率的な変換作業のための直感的なインターフェースを提供します。

## ✨ 主な機能

- **かんたん変換**: `.sspj` ファイルを選択してボタンを押すだけで変換が完了します。
- **ドラッグ＆ドロップ対応**: ファイルやフォルダを直接ウィンドウにドラッグ＆ドロップできます。
- **一括変換**: フォルダを選択することで、その中に含まれる複数の `.sspj` ファイルをまとめて変換できます。
- **アセットの埋め込み**: 変換時に画像などのアセットデータをバイナリに直接埋め込むオプションをサポートしています。
- **変換履歴**: 過去の変換履歴から、同じ設定で素早く再実行できます。
- **リアルタイムログ**: 進行状況やエラーログを画面上でリアルタイムに確認できます。

## 📚 ドキュメント

詳細なドキュメントは `docs/` フォルダにあります。

- [**ドキュメントサイト (ホスト版)**](https://cri-middleware.github.io/SSConverterGUI/ja/)
- [**ドキュメント (日本語)**](./docs/ja/index.md)
- [**Documentation (English)**](./docs/en/index.md)
- [**AI アシスタント向け**](https://cri-middleware.github.io/SSConverterGUI/ja/llms.txt) — このドキュメントを Markdown で提供します。`llms.txt` はページの目次、`llms-full.txt` は全ページを 1 ファイルにまとめたものです
- [**SpriteStudio Docs（ポータル）**](https://cri-middleware.github.io/SpriteStudio-Docs/ja/) — SDK と全公式 Player の入口

### クイックリンク（日本語）

- [インストール](./docs/ja/install.md)
- [使い方](./docs/ja/usage.md)
- [制約と適用範囲](./docs/ja/limitations.md)
- [開発者向け](./docs/ja/development.md)

## 🚀 クイックスタート

**自分のプロジェクトを変換する場合**はこのまま下へ。ダウンロードして、`.sspj` を放り込んで、変換するだけです。
**SSConverter GUI 自体を開発する場合**は下の[ソースからのビルド](#%EF%B8%8F-ソースからのビルド)へ。

動作環境は **macOS 10.15 以降**（ユニバーサル）または **Windows 10 / 11**（x86_64 版と Arm 版を用意）です。いずれもポータブル版のため、インストーラはありません。対応するのは **SpriteStudio 7.6 以上**で作成されたプロジェクトです（`.ssab` / `.ssqb` の形式がその版に対して定義されています）。

1. **ダウンロード**: [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) からお使いの OS と CPU に合ったアーカイブ（macOS は `SSConverterGUI_<version>_universal.tar.gz`、Windows は `SSConverterGUI_<version>_x86_64.zip` か `…_arm64.zip`）を入手し、展開して起動します。Windows 版の `.exe` は未署名のため初回起動時に SmartScreen の警告が表示されます。詳しくは[インストール手順](./docs/ja/install.md)を参照してください。
2. **選択**: `.sspj` ファイル（または複数の `.sspj` を含むフォルダ）を、**「📥 Target .sspj File or Folder」** の枠へドラッグ＆ドロップします。
3. **変換**: **「⚡ Convert」** ボタンをクリックします。ステータスはボタン横のバッジに、1 件ごとの結果はその下のログに出ます。出力は `.sspj` の隣にできる、プロジェクト名のフォルダです（**Embedded Assets** にチェックを入れたときは `<name>_emb/`）。**「📂 Reveal Output」** で開けます。

   ```
   Ringo/                 ← SpriteStudio のプロジェクト
   ├── Ringo.sspj         ← これをドロップする
   ├── Ringo.png
   ├── …
   └── Ringo/             ← ⚡ Convert が書き出す
       ├── Ringo.ssab
       ├── Ringo.png
       └── …
   ```

出力したフォルダを、お使いの Player がアセットを読み込む場所へコピーします。どこに置くかは各 Player のクイックスタートにあります。[プラットフォームの選び方](https://cri-middleware.github.io/SpriteStudio-Docs/ja/overview/choose-your-platform/)から辿れます。

SpriteStudio のデータが手元に無くても始められます。[公式のサンプルデータ](https://www.webtech.co.jp/help/ja/spritestudio7/download/sample/)がそのまま使えます。キャラクターなら [Ringo](https://www.webtech.co.jp/help/ja/spritestudio7/download/sample/#ringo) が手頃です。

**次に読む:** [使い方](./docs/ja/usage.md) · [インストール](./docs/ja/install.md) · [制約と適用範囲](./docs/ja/limitations.md)

## 🛠️ ソースからのビルド

変換のコア機能として `SpriteStudio-SDK` をサブモジュールとして使用しているため、クローンの際は `--recursive` を付けてください。ビルドには Node.js (v26 以上)、`pnpm`、Rust ツールチェーンが必要です。

```bash
git clone --recursive https://github.com/cri-middleware/SSConverterGUI.git
cd SSConverterGUI
pnpm install
pnpm run tauri dev
```

前提条件・技術スタック・ビルド手順の詳細は、[開発者向けガイド](./docs/ja/development.md)を参照してください。

## 🔗 関連リポジトリ

このツールが書き出したものは、そのまま各公式 Player が読み込みます。同じ `.ssab` がすべての Player で動きます。

- [SpriteStudio Docs](https://cri-middleware.github.io/SpriteStudio-Docs/ja/) — SDK と全公式 Player の入口。どれを使うかもここで選べます
- [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) — 本アプリの土台である `ssconverter` クレートを提供する SDK 本体（GUI なしで同じ変換をするのが `ssconverter-cli`）

## 📄 ライセンス

本リポジトリのソースコードおよび成果物は、[LICENSE.md](./LICENSE.md) (BSD-3-Clause) の条件下で提供されています。参考訳は [LICENSE.ja.md](./LICENSE.ja.md) にあります。

本アプリは Rust の依存グラフ全体（Tauri/wry、`ssconverter` SDK とその推移的依存）を静的リンクし、フロントエンドのバンドルと Inter フォントも埋め込んでいるため、
**`THIRD_PARTY_NOTICES.md` は各リリースアーカイブに実行ファイルと並べて同梱されます**。リポジトリには commit せずリリース時に生成しているので（Rust のクレートは `cargo about`、npm パッケージとフォントは `scripts/generate-npm-notices.mjs`）、ダウンロードしたバイナリと常に一致します。許容ライセンスの一覧は
`about.toml` にあり、一覧に無いライセンスが入るとリリースビルドが失敗します（気づかないまま出荷されません）。

同梱の `SpriteStudio-SDK` サブモジュールは、本リポジトリと同じ BSD-3-Clause です。
