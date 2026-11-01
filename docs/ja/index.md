# 🖥️ SSConverter GUI

SSConverter GUI は、SpriteStudio のプロジェクトファイル (`.sspj`) を、Player が読み込むバイナリ（アニメーションの `.ssab` とシーケンスの `.ssqb`）に変換するための、クロスプラットフォーム対応の**デスクトップアプリケーション**です。コマンドラインの知識がなくても使えます。

## ✨ 主な機能

- **どの Player とも同じ変換。** SDK の `ssconverter`（`ssconverter-cli` や各 Player のインポーターと同じ変換）にウィンドウを付けたものなので、書き出した `.ssab` と `.ssqb` はどの公式 Player でも読み込めます。
- **ファイルでもフォルダでも、ドラッグ＆ドロップで。** `.sspj` を 1 つ、またはフォルダごとドロップすれば、その下のプロジェクトを 1 回でまとめて変換します。コマンドラインは要りません。失敗したプロジェクトはフルパスとコンバーターの理由つきで一覧され、残りの変換は無駄になりません。
- **出力先とテクスチャの持ち方を選べる。** 埋め込み（1 つのファイルにまとめる）か外部参照（差し替えやパック間の共有ができるよう横に残す）かを選び、`.sspj` の隣の `<name>/`（埋め込みでは `<name>_emb/`）または任意の出力先フォルダ（次のプロジェクトにも引き継がれます）に書き出せます。**「📂 Reveal Output」** で開けます。
- **進み具合が見えて、止められる。** プロジェクトを数えるバーの下にコンバーターのログが流れ、**「Stop / Cancel」** は実行中のファイルで止めて、終わった分を残します。**「Copy」** は結果（失敗・警告・バージョン）をクリップボードに入れるので、不具合の報告や AI アシスタントにそのまま貼れます。
- **履歴からやり直せる。** 実行ごとに設定ごと残るので、プロジェクトを直したあとの再変換で何も選び直さずに済みます。

## どのコンバータを使うか

3 つのコンバータはいずれも同じ `libssconverter` を利用しており、生成される `.ssab` は同じです。作業スタイルに合わせて選んでください。

| ツール | こんなときに |
|---|---|
| **SSConverter GUI**（本アプリ） | ドラッグ＆ドロップやフォルダ単位の一括変換を、コマンドラインなしで行いたいとき。 |
| [`ssconverter-cli`](https://github.com/cri-middleware/SpriteStudio-SDK/blob/HEAD/cli/README.ja.md) | 変換をスクリプト化したり、CI で実行したいとき。 |
| [`ssconverter-web`](https://cri-middleware.github.io/SSPlayerForWeb/ssconverter/) | インストール不要で、ブラウザから単発の変換を行いたいとき。 |

## 次のステップ

- [インストール](install.md) — アプリケーションのダウンロードと起動。
- [使い方](usage.md) — 最初の `.sspj` ファイルを変換する。
- [制約と適用範囲](limitations.md) — 何を変換し、何を Player に委ねているか。
- [開発者向け](development.md) — ソースコードからビルドする。

## 関連リンク

- [SpriteStudio Docs](https://cri-middleware.github.io/SpriteStudio-Docs/ja/) — SDK と公式 Player のドキュメントポータル。
- [SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) — 本アプリケーションが利用する
  `ssconverter` クレートを提供する SDK 本体。
