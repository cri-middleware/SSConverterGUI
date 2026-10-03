# Security Policy

## Supported Versions

SSConverter GUI is in beta. Fixes are issued against the latest release only — if you
are on an older one, please reproduce on the current release before reporting.

| Version | Supported |
|---|---|
| Latest `7.0.x` release | ✅ |
| Anything older | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub Issue for a security problem.** Report it privately through the
official inquiry form:

👉 [**CRI Middleware Inquiry Form (English)**](https://www.webtech.co.jp/contact/en.html)

The English form has no file upload. If you need to send a reproduction, use the
[Japanese Help Center form](https://www.webtech.co.jp/help/ja/spritestudio7/inquiries/ssplayer_tool/),
which takes a zip of up to 8 MB.

Please include:

- What an attacker could achieve, and the conditions required.
- Steps to reproduce, and a minimal `.sspj` or input file if the issue is triggered by one.
- The application version (shown in the app) and your OS version.

We will confirm receipt, tell you whether we can reproduce it, and let you know when a fix ships.
Please give us a chance to release that fix before disclosing publicly.

### Which repository to report to

This repository covers the **GUI application** — its Tauri commands, file handling, and bundled
frontend. The conversion engine itself (the `ssconverter` crate) lives in SpriteStudio-SDK. Report a
problem in it here all the same and say so; we will route it.

## Scope Notes

The Windows executable is distributed unsigned. That is a known and documented property of the
releases rather than a vulnerability — see the
[installation guide](https://cri-middleware.github.io/SSConverterGUI/install/).

---

# セキュリティポリシー

## サポート対象バージョン

SSConverter GUI は beta 版です。修正は最新リリースに対してのみ提供されます。古いバージョンをご利用の場合は、最新リリースで再現することをご確認のうえご報告ください。

| バージョン | サポート |
|---|---|
| 最新の `7.0.x` リリース | ✅ |
| それ以前 | ❌ |

## 脆弱性の報告

**セキュリティに関する問題は、公開の GitHub Issue に投稿しないでください。** 再現データ（8 MB までの zip ファイル）の添付も可能なヘルプセンターより、非公開でご報告ください。

👉 [**ヘルプセンター（お問い合わせフォーム）**](https://www.webtech.co.jp/help/ja/spritestudio7/inquiries/ssplayer_tool/)

ご報告には以下を含めてください。

- 攻撃者が何を行えるか、およびその成立条件
- 再現手順。入力ファイルが起因する場合は、再現可能な最小限の `.sspj` など
- アプリケーションのバージョン（アプリ内に表示されます）と、OS のバージョン

受領の確認、再現可否、修正版の公開時期についてご連絡します。修正を公開するまでの間、公表をお待ちいただけますようお願いします。

### 報告先リポジトリの判断

本リポジトリが対象とするのは **GUI アプリケーション**（Tauri コマンド、ファイル処理、同梱フロントエンド）です。変換エンジン自体（`ssconverter` クレート）は SpriteStudio-SDK で開発されています。その問題も、その旨を添えて本リポジトリへご報告ください。こちらで振り分けます。

## 既知の注意点

Windows 版の実行ファイルは未署名で配布しています。これは脆弱性ではなく、既知かつ文書化された仕様です。詳しくは[インストール手順](https://cri-middleware.github.io/SSConverterGUI/ja/install/)を参照してください。
