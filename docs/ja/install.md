# 📥 インストール

このページは、完成済みのアプリケーションをそのまま使用したい方向けです。コマンドラインの操作は必要ありません。ソースコードからビルドしたい場合は[開発者向け](development.md)を参照してください。

## 動作環境

| OS | 必要な環境 |
|---|---|
| **macOS** | macOS 10.15 (Catalina) 以降。Apple Silicon / Intel はどちらも同一のユニバーサルビルドで動作します。 |
| **Windows** | Windows 10 / 11 (64-bit) と [WebView2 ランタイム](https://developer.microsoft.com/microsoft-edge/webview2/)。WebView2 は現行の Windows 10 / 11 にはプリインストールされています。x86_64 PC と Arm PC でビルドが分かれています。 |

いずれもポータブル版で、インストーラはありません。アプリ本体は展開したフォルダの中で完結し、それ以外に書き込むのはユーザーごとのデータ（テーマの設定と変換履歴）だけです。保存先は標準的なアプリケーションデータフォルダです。

## ダウンロード

[GitHub Releases](https://github.com/cri-middleware/SSConverterGUI/releases) ページを開き、最新リリースからお使いの OS 用のアーカイブをダウンロードしてください。

| OS | ファイル |
|---|---|
| macOS (Apple Silicon / Intel) | `SSConverterGUI_<version>_universal.tar.gz` |
| Windows (x86_64) | `SSConverterGUI_<version>_x86_64.zip` |
| Windows on Arm | `SSConverterGUI_<version>_arm64.zip` |

いずれのアーカイブにも `LICENSE.md`、`LICENSE.ja.md`、`THIRD_PARTY_NOTICES.md` が同梱されています。

!!! tip "Windows 版はどちらを選べばよいですか"

    **設定 → システム → バージョン情報** を開き、**システムの種類** を確認してください。*ARM ベースプロセッサ* と表示されていれば `arm64`、そうでなければ `x86_64` のアーカイブです。Windows 11 の Arm PC ではエミュレーションで x86_64 版も動作しますが、arm64 版のほうが変換が明確に高速です。

### ダウンロードファイルの検証（任意）

各リリースには、アーカイブごとのチェックサムを記載した `SHA256SUMS` が添付されています。アーカイブと同じフォルダにダウンロードすると、ファイルが破損なく取得できたかを確認できます。

macOS の場合:

```bash
shasum -a 256 -c SHA256SUMS --ignore-missing
```

Windows (PowerShell) の場合 — 表示されたハッシュ値を `SHA256SUMS` の該当行と見比べてください（PowerShell は大文字、`SHA256SUMS` は小文字で表示します）:

```powershell
Get-FileHash .\SSConverterGUI_<version>_<arch>.zip -Algorithm SHA256
```

## アプリケーションの起動

### macOS

1. `.tar.gz` をダブルクリックすると、フォルダが作成され展開されます。
2. その中の `SSConverterGUI.app` を **アプリケーション** フォルダへ移動します。
3. ダブルクリックして起動します。

本アプリケーションは株式会社 CRI・ミドルウェアの Developer ID 証明書で署名され、Apple の公証
(notarization) を受けています。そのため通常どおり起動でき、右クリック →「開く」や、隔離属性の手動解除は **不要** です。

!!! warning "「アプリケーションが壊れています」「開発元が未確認です」と表示される場合"

    ダウンロード中にファイルが破損したか、公式ビルドではない可能性があります。いったん削除し、
    [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) ページから再度ダウンロードのうえ、上記の手順で `SHA256SUMS` と照合してください。

### Windows

1. `.zip` を右クリックし、「**すべて展開**」で任意の場所に展開します。
2. `SSConverterGUI.exe` を実行します。

!!! warning "初回起動時の SmartScreen 警告について"

    Windows 版の実行ファイルはコード署名を行っていないため、初回起動時に青い画面で「**Windows によって PC が保護されました**」と表示されます。これは署名がないことによるもので、アプリケーションに問題が検出されたわけではありません。

    続行するには「**詳細情報**」→「**実行**」をクリックしてください。事前にファイルを確認したい場合は、上記の手順で `SHA256SUMS` と照合してください。

アプリケーションが起動したら、[使い方](usage.md)へ進んでください。

## アンインストール

展開したフォルダ、または `SSConverterGUI.app` を削除してください。システム全体に対するインストールは行っていません。テーマの設定と変換履歴のみが、ユーザーごとの標準的なアプリケーションデータフォルダに残ります。
