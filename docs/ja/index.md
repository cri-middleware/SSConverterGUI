# 🖥️ SSConverter GUI

SSConverter GUI は、SpriteStudio のプロジェクトファイル (`.sspj`) をバイナリ形式 (`.ssab`) に変換する
ための、クロスプラットフォーム対応の**デスクトップアプリケーション**です。Tauri v2、Vite、TypeScript を
使用して構築されており、コマンドラインの知識がなくても効率的に変換作業を行えます。

## ✨ 主な機能

- **かんたん変換**: `.sspj` ファイルを選択してボタンを押すだけで変換が完了します。
- **ドラッグ＆ドロップ対応**: ファイルやフォルダを直接ウィンドウにドラッグ＆ドロップできます。
- **一括変換**: フォルダを選択することで、その中に含まれる複数の `.sspj` ファイルをまとめて変換できます。
- **アセットの埋め込み**: 変換時に画像などのアセットデータをバイナリに直接埋め込むオプションをサポートしています。
- **変換履歴**: 過去の変換履歴から、同じ設定で素早く再実行できます。
- **リアルタイムログ**: 進行状況やエラーログを画面上でリアルタイムに確認できます。

## どのコンバータを使うか

3 つのコンバータはいずれも同じ `libssconverter` を利用しており、生成される `.ssab` は同じです。
作業スタイルに合わせて選んでください。

| ツール | こんなときに |
|---|---|
| **SSConverter GUI**（本アプリ） | ドラッグ＆ドロップやフォルダ単位の一括変換を、コマンドラインなしで行いたいとき。 |
| [`ssconverter-cli`](https://github.com/cri-middleware/SpriteStudio-SDK/tree/main/cli) | 変換をスクリプト化したり、CI で実行したいとき。 |
| [`ssconverter-web`](https://cri-middleware.github.io/SSPlayerForWeb/ssconverter/) | インストール不要で、ブラウザから単発の変換を行いたいとき。 |

## 次のステップ

- [インストール](install.md) — アプリケーションのダウンロードと起動。
- [使い方](usage.md) — 最初の `.sspj` ファイルを変換する。
- [開発者向け](development.md) — ソースコードからビルドする。

## 関連リンク

- [SpriteStudio Docs](https://cri-middleware.github.io/SpriteStudio-Docs/ja/) — SDK と公式 Player の
  ドキュメントポータル。
- [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) — 本アプリケーションが利用する
  `ssconverter` クレートを提供する SDK 本体。
