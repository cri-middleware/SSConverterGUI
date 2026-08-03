[**English**](./README.md) | [**日本語**](./README.ja.md)

# SSConverter GUI

SSConverter GUI は、SpriteStudio のプロジェクトファイル (`.sspj`) をバイナリ形式 (`.ssab`) に変換するための、クロスプラットフォーム対応のGUIアプリケーションです。
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

- [**ドキュメントサイト (ホスト版)**](https://cri-middleware.github.io/SSConverterGUI/) — 🚧 初回リリース後に公開
- [**ドキュメント (日本語)**](./docs/ja/index.md)
- [**Documentation (English)**](./docs/en/index.md)
- [**SpriteStudio Docs（ポータル）**](https://cri-middleware.github.io/SpriteStudio-Docs/) — SDK と全公式 Player の入口 — 🚧 初回リリース後に公開

### クイックリンク（日本語）

- [インストール](./docs/ja/install.md)
- [使い方](./docs/ja/usage.md)
- [開発者向け](./docs/ja/development.md)

## 🚀 クイックスタート

動作環境は **macOS 10.15 以降**（ユニバーサル）または **Windows 10 / 11**（x64 版と Arm 版を用意）です。いずれもポータブル版のため、インストーラはありません。

1. **ダウンロード**: [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) からお使いの OS と CPU に合ったアーカイブを入手し、展開して起動します。Windows 版の `.exe` は未署名のため初回起動時に SmartScreen の警告が表示されます。詳しくは[インストール手順](./docs/ja/install.md)を参照してください。
2. **選択**: `.sspj` ファイル（または複数の `.sspj` を含むフォルダ）をターゲットエリアにドラッグ＆ドロップします。
3. **変換**: **「⚡ Convert」** ボタンをクリックし、画面下部のステータスとログで完了を確認します。

出力先フォルダの指定やアセットの埋め込みを含む詳しい手順は、[使い方](./docs/ja/usage.md)を参照してください。

## 🛠️ ソースからのビルド

変換のコア機能として `SpriteStudio-SDK` をサブモジュールとして使用しているため、クローンの際は `--recursive` を付けてください。
ビルドには Node.js (v26 以上)、`pnpm`、Rust ツールチェーンが必要です。

```bash
git clone --recursive https://github.com/cri-middleware/SSConverterGUI.git
cd SSConverterGUI
pnpm install
pnpm run tauri dev
```

前提条件・技術スタック・ビルド手順の詳細は、[開発者向けガイド](./docs/ja/development.md)を参照してください。

## 🔗 関連リポジトリ

- [SpriteStudio Docs](https://github.com/cri-middleware/SpriteStudio-Docs) — SDK と公式 Player のドキュメントポータル
- [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) — `ssconverter` クレートを提供する SDK 本体

## 📄 ライセンス

本リポジトリのソースコードおよび成果物は、[LICENSE.md](./LICENSE.md) (BSD-3-Clause) の条件下で提供されています。

同梱されている `SpriteStudio-SDK` サブモジュールの利用条件については、該当リポジトリのライセンスファイルを参照してください。
