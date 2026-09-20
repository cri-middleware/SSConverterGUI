# Security Policy

## Supported Versions

Security fixes are made against the latest release. Please reproduce an issue on the most recent
version from the [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) page before
reporting it.

## Reporting a Vulnerability

**Please do not open a public GitHub Issue for a security vulnerability.** Use one of the private
channels below so the problem can be fixed before it becomes widely known.

1. **GitHub Security Advisory (preferred)** — [report it privately here](https://github.com/cri-middleware/SSConverterGUI/security/advisories/new).
   The report stays private to you and the maintainers until an advisory is published.
2. **CRI Middleware inquiry form** — [English](https://www.webtech.co.jp/contact/en.html) or
   [Japanese](https://www.webtech.co.jp/help/ja/spritestudio7/inquiries/ssplayer_tool/), if you would rather not use
   GitHub. Only the Japanese form takes an attachment (zip, up to 8 MB).

Please include, as far as you can:

- The application version (shown in the app) and your OS version.
- What an attacker could achieve, and the conditions required.
- Reproduction steps, and a minimal `.sspj` or input file if the issue is triggered by one.

We will acknowledge your report and keep you updated on our assessment and the fix. Please give us
a reasonable window to release a fix before disclosing the issue publicly.

## Scope

This repository covers the **GUI application** — its Tauri commands, file handling, and bundled
frontend. Vulnerabilities in the conversion engine itself (the `ssconverter` crate) belong to the
[SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) repository; please report
those there, or through the inquiry form above.

Note that the Windows executable is distributed unsigned, which is a known and documented property
of our releases rather than a vulnerability — see the
[installation guide](https://cri-middleware.github.io/SSConverterGUI/install/).

---

# セキュリティポリシー

## サポート対象バージョン

セキュリティ修正は最新リリースに対して行います。ご報告の前に、
[Releases](https://github.com/cri-middleware/SSConverterGUI/releases) ページの最新版で再現するか
をご確認ください。

## 脆弱性の報告方法

**セキュリティ上の問題を公開の GitHub Issue に投稿しないでください。** 修正前に問題が広く知られる
ことを防ぐため、以下の非公開の窓口をご利用ください。

1. **GitHub Security Advisory（推奨）** — [こちらから非公開で報告](https://github.com/cri-middleware/SSConverterGUI/security/advisories/new)
   できます。アドバイザリを公開するまで、報告内容は報告者と開発者のみが閲覧できます。
2. **CRI・ミドルウェア ヘルプセンター** — GitHub をご利用にならない場合や、サイズの大きい再現データを
   添付する必要がある場合は[お問い合わせフォーム](https://www.webtech.co.jp/help/ja/spritestudio7/inquiries/ssplayer_tool/)
   をご利用ください。

可能な範囲で、以下の情報をお知らせください。

- アプリケーションのバージョン（アプリ内に表示されます）と、OS のバージョン。
- 攻撃者が何を行えるか、およびその成立条件。
- 再現手順。入力ファイルが起因する場合は、再現可能な最小限の `.sspj` など。

ご報告を受領した旨と、調査状況および修正の見通しをご連絡いたします。修正版のリリースまで、公開での
開示はお控えいただけますようお願いいたします。

## 対象範囲

本リポジトリが対象とするのは **GUI アプリケーション**（Tauri コマンド、ファイル処理、同梱フロント
エンド）です。変換エンジン自体（`ssconverter` クレート）の脆弱性は
[SpriteStudio-SDK](https://github.com/cri-middleware/SpriteStudio-SDK) リポジトリの対象範囲となり
ますので、同リポジトリまたは上記ヘルプセンターへご報告ください。

なお、Windows 版の実行ファイルを未署名で配布している点は、脆弱性ではなく既知かつ文書化された仕様
です。詳しくは[インストール手順](https://cri-middleware.github.io/SSConverterGUI/ja/install/)を
参照してください。

---

### Company Info

**CRI Middleware Co., Ltd.**  
[https://www.cri-mw.co.jp/](https://www.cri-mw.co.jp/)  
Copyright © CRI Middleware Co., Ltd.
