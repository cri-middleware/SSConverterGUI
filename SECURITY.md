# Security Policy

## Supported Versions

Security fixes are made against the latest release. Please reproduce an issue on the most recent
version from the [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) page before
reporting it.

## Reporting a Vulnerability

**Please do not open a public GitHub Issue for a security vulnerability.** Report it privately
through the official inquiry form, so the problem can be fixed before it becomes widely known:

👉 [**CRI Middleware Inquiry Form (English)**](https://www.webtech.co.jp/contact/en.html)

The English form has no file upload. If you need to send a reproduction, use the [Japanese Help
Center form](https://www.webtech.co.jp/help/ja/spritestudio7/inquiries/ssplayer_tool/), which takes a zip of up to 8 MB.

Please include, as far as you can:

- The application version (shown in the app) and your OS version.
- What an attacker could achieve, and the conditions required.
- Reproduction steps, and a minimal `.sspj` or input file if the issue is triggered by one.

We will acknowledge your report and keep you updated on our assessment and the fix. Please give us
a reasonable window to release a fix before disclosing the issue publicly.

## Scope

This repository covers the **GUI application** — its Tauri commands, file handling, and bundled
frontend. Vulnerabilities in the conversion engine itself (the `ssconverter` crate) belong to
SpriteStudio-SDK. Report those here all the same, through the inquiry form above; we will
route them.

Note that the Windows executable is distributed unsigned, which is a known and documented property
of our releases rather than a vulnerability — see the
[installation guide](https://cri-middleware.github.io/SSConverterGUI/install/).

---

# セキュリティポリシー

## サポート対象バージョン

セキュリティ修正は最新リリースに対して行います。ご報告の前に、
[Releases](https://github.com/cri-middleware/SSConverterGUI/releases) ページの最新版で再現するかをご確認ください。

## 脆弱性の報告方法

**セキュリティ上の問題を公開の GitHub Issue に投稿しないでください。** 修正前に問題が広く知られることを防ぐため、再現データの添付も可能なヘルプセンターより、非公開でご報告ください。

👉 [**ヘルプセンター（お問い合わせフォーム）**](https://www.webtech.co.jp/help/ja/spritestudio7/inquiries/ssplayer_tool/)

可能な範囲で、以下の情報をお知らせください。

- アプリケーションのバージョン（アプリ内に表示されます）と、OS のバージョン。
- 攻撃者が何を行えるか、およびその成立条件。
- 再現手順。入力ファイルが起因する場合は、再現可能な最小限の `.sspj` など。

ご報告を受領した旨と、調査状況および修正の見通しをご連絡いたします。修正版のリリースまで、公開での開示はお控えいただけますようお願いいたします。

## 対象範囲

本リポジトリが対象とするのは **GUI アプリケーション**（Tauri コマンド、ファイル処理、同梱フロントエンド）です。変換エンジン自体（`ssconverter` クレート）の脆弱性は、SpriteStudio-SDK リポジトリの対象範囲です。その場合も上記ヘルプセンターからご報告ください。こちらで振り分けます。

なお、Windows 版の実行ファイルを未署名で配布している点は、脆弱性ではなく既知かつ文書化された仕様です。詳しくは[インストール手順](https://cri-middleware.github.io/SSConverterGUI/ja/install/)を参照してください。
