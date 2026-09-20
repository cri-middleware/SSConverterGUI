# Releasing SSConverter GUI

Maintainers only. Contributors do not run any of this — see [CONTRIBUTING.md](./CONTRIBUTING.md)
and the [Development guide](./docs/en/development.md), which covers building the app and the
documentation site.

## Cutting a release

A release is a tag, pushed first and built second: push `v<version>`, then dispatch **Release**
from that tag with `upload_release=true`. The tag names the Release, and `upload_release=true`
from anything else fails the run rather than quietly producing none. The default dispatch
(`upload_release=false`) is a QA build and creates no Release. Releases are always created as
drafts — a human checks the assets and the generated notes, then publishes from the UI, choosing
pre-release or latest there. Publishing is also what deploys the documentation site: merging to
`main` publishes nothing, because the site documents the released application.

Keep `package.json`'s `version`, `src-tauri/Cargo.toml`'s crate `version` and the tag in step.
`package.json` is what `tauri.conf.json` reads and what every archive is named after;
`scripts/release-version.sh` prints it, and the release refuses a tag that disagrees.

`scripts/build-release.sh` and its `.ps1` twin are the one entry point, and `release.yml` **is**
those scripts in all three of its steps, so CI and a local run cannot drift. Each run builds this
machine's half of the release and then checks it, calling `scripts/release-macos.sh` on macOS and
`scripts/release-windows.ps1` once per `arch=` on Windows — that is where a platform's build
lives, and it is called, never reimplemented. `build=no` is the phase after the matrix: check the
archives already in `in=` and write `SHA256SUMS` over them. What is required differs accordingly —
a build run produced one platform's archives and cannot have produced the others, so only those
are required, while `build=no` requires all three. Both script pairs are verified to write a
byte-identical `SHA256SUMS`.

**Signing stays the environment's decision.** `release-macos.sh` signs when
`APPLE_SIGNING_IDENTITY` is set and notarizes when the `APPLE_API_*` credentials are set too, so a
build with none of them is simply unsigned. `sign=yes` additionally *requires* the finished `.app`
to be signed, notarized and stapled — which is what `release.yml` passes on a `v*` tag, because a
missing or expired secret otherwise turns signing into a silent no-op that looks exactly like
"signing was never requested". `sign=no` takes the `APPLE_*` variables out of the environment for
a quick unsigned build. There is no `sign=` on the Windows side; that executable is deliberately
unsigned.

**The check is the part that was missing.** Three jobs on two operating systems feed one
directory, and the `*.zip` / `*.tar.gz` globs attach whatever is in it — so a matrix entry that
built nothing leaves a Release with no download for that platform, and a stale archive from an
earlier version gets attached alongside the current one. Neither is noticed until somebody
downloads.

<br>

---

# SSConverter GUI のリリース手順

維持者向けです。コントリビューターがこの手順を実行することはありません（[CONTRIBUTING.md](./CONTRIBUTING.md) と、アプリおよびドキュメントサイトのビルドを扱う[開発ガイド](./docs/ja/development.md)を参照してください）。

## リリースの手順

リリースはタグです。先にタグを push し、ビルドはその後です。`v<version>` を push し、そのタグから
**Release** を `upload_release=true` でディスパッチします。Release の名前はタグで決まり、それ以外
からの `upload_release=true` は、Release を作らずに済ませるのではなく実行を失敗させます。既定の
ディスパッチ（`upload_release=false`）は QA ビルドで、Release は作りません。Release は必ず下書きで
作られます。人が asset と生成された notes を確認し、pre-release / latest を選んで UI から公開して
ください。ドキュメントサイトが配信されるのもこの公開時です。`main` へのマージでは公開されません
（サイトはリリース済みのアプリケーションを説明するものだからです）。

`package.json` の `version`、`src-tauri/Cargo.toml` のクレート `version`、そしてタグを揃えて
ください。`tauri.conf.json` が読み、各アーカイブの名前になるのは `package.json` の方です。
`scripts/release-version.sh` がその値を表示し、食い違うタグはリリースが拒否します。

`scripts/build-release.sh` と `.ps1` 双子が唯一の入口で、`release.yml` は 3 ステップとも**その
スクリプトそのもの**なので、CI と手元がずれません。各実行はそのマシンが担当する半分をビルドして
検査します。macOS では `scripts/release-macos.sh`、Windows では `arch=` ごとに
`scripts/release-windows.ps1` を**呼び出します**（各プラットフォームのビルドはそこにあり、
再実装はしません）。`build=no` はマトリクスの後の工程で、`in=` にあるアーカイブを検査して
`SHA256SUMS` を書きます。必要なものもそれに応じて変わります。ビルド実行は 1 プラットフォーム分
しか作れないのでそれだけを要求し、`build=no` は 3 つすべてを要求します。両方のスクリプト対が
バイト一致の `SHA256SUMS` を書くことは検証済みです。

**署名は環境が決めます。** `release-macos.sh` は `APPLE_SIGNING_IDENTITY` があれば署名し、
`APPLE_API_*` も揃っていれば公証します。どれも無ければ単に未署名です。`sign=yes` はさらに、
出来上がった `.app` が署名・公証・ステープル済みであることを**要求**します。`release.yml` が
`v*` タグでこれを渡すのは、シークレットの欠落や期限切れが「署名を要求しなかった」場合と見分けの
つかない無言の no-op になるからです。`sign=no` は `APPLE_*` を環境から外して素早く未署名ビルドを
作ります。Windows 側に `sign=` はありません。あの実行ファイルは意図的に未署名です。

**欠けていたのは検査です。** 2 つの OS 上の 3 ジョブが 1 つのディレクトリに集まり、`*.zip` /
`*.tar.gz` の glob はそこにあるものを何でも添付します。つまり、何もビルドしなかったマトリクス
エントリはそのプラットフォームのダウンロードが無い Release を残し、以前のバージョンの古い
アーカイブは現行のものと並んで添付されます。どちらも誰かがダウンロードするまで気づかれません。
