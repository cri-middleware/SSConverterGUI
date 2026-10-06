# Releasing SSConverter GUI

Maintainers only. Contributors do not run any of this — see [CONTRIBUTING.md](./CONTRIBUTING.md)
and the [Development guide](./docs/en/development.md), which covers building the app, a release
archive and the documentation site.

## Cutting a release

Anyone with the Write role on this repository can cut a release: every step is a branch, a pull request, a tag, a workflow run or a Release, and the signing credentials are organization secrets, so nothing depends on whose machine runs it. You need `git`, `gh` 2.87 or later (run `gh auth login` once), Node.js and a Rust toolchain. The commands are bash; on Windows, run them in Git Bash.

A release is a tag on `main`, pushed first and built second. Three versions move together. `version` in `package.json` is the one that counts: `tauri.conf.json` reads it, the app shows it, every archive is named after it, and `scripts/release-version.sh` prints it. The crate `version` in `src-tauri/Cargo.toml` is a copy that moves in the same step, and `scripts/release-version.sh` refuses to print a version while the two disagree. The tag is `v` followed by it, and the release build refuses a tag that disagrees. The SDK this release ships is versioned on its own, by the submodule. Branches follow git-flow: `develop` integrates, `main` holds released commits only, and `release/X.Y` lives for one release — cut from `develop` for a new `X.Y`, or from the line's latest tag for a patch, and deleted once the release is out.

```bash
VERSION=7.0.1                                       # what is being released
BRANCH=release/$(echo "$VERSION" | cut -d. -f1,2)   # release/7.0
```

### 1. Branch

A new `X.Y` is cut from `develop`. A patch release is cut from the line's latest tag, whether or not an earlier `release/X.Y` is still there, and its fixes are committed or cherry-picked onto it.

```bash
git fetch origin
git switch -c "$BRANCH" origin/develop           # a new X.Y
git switch -C "$BRANCH" v7.0.0                   # a patch release: the line's latest tag
```

### 2. SDK, version and changelog

In one commit. The converter is the `ssconverter` crate built from the `SpriteStudio-SDK` submodule, so the submodule is the SDK this release ships: check it out at that SDK release's tag. Set the version in `package.json` and `src-tauri/Cargo.toml`, and let cargo rewrite `src-tauri/Cargo.lock` for both — CI's clippy runs `--locked`. Then date the version's heading in `CHANGELOG.md` as `## [X.Y.Z] - YYYY-MM-DD`; on a patch release, add the heading and its link line at the bottom of the file.

```bash
SDK_TAG=v7.0.0                                   # the SDK release this ships
git -C SpriteStudio-SDK fetch --tags origin && git -C SpriteStudio-SDK checkout "$SDK_TAG"
export VERSION
npm pkg set version="$VERSION"
perl -pi -e 's/^version = ".*"/version = "$ENV{VERSION}"/' src-tauri/Cargo.toml
cargo update -p ssconverter-gui --manifest-path src-tauri/Cargo.toml
# date the heading in CHANGELOG.md, then:
git diff
git add SpriteStudio-SDK package.json src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md
git commit -m "chore(release): v$VERSION"
```

### 3. Pull request and QA build

Open the pull request into `main`; its CI runs the unit tests, the frontend build, `cargo fmt` and clippy. Then dispatch the release workflow from the branch. With `upload_release` left false it builds, signs and checks the macOS archive and both Windows archives exactly as the release will, keeps them on the run (`SSConverterGUI-release-dist`), and creates no Release. Try the app from those archives on both systems. Fix anything on the branch and repeat until both runs are green.

```bash
git push -u origin "$BRANCH"
gh pr create -B main --title "Release v$VERSION" --body ""
RUN=$(gh workflow run release.yml --ref "$BRANCH" | sed 's|.*/||')
gh run watch "${RUN:?}" --exit-status
gh run download "${RUN:?}" -n SSConverterGUI-release-dist -D qa
```

A missing signing secret does not fail this run: the macOS job logs `Skipping code signing` or `Skipping notarization` and builds an unsigned app. Look for those lines here, because the tag run in step 5 requires the signature and fails instead.

### 4. Merge and tag

Merge with a merge commit, never a squash or a rebase, so that `main` keeps the commits the QA build built rather than copies of them. Tag `main` only when its tree is the one the QA build built. It differs only when `main` held commits the branch did not; merge `main` into the branch and go back to step 3.

```bash
gh pr merge "$BRANCH" --merge
git switch main && git pull --ff-only
git diff --stat HEAD^2 HEAD                           # must print nothing
TAG=v$(scripts/release-version.sh) && echo "$TAG"
git tag -a "$TAG" -m "$TAG" && git push origin "$TAG"
```

### 5. Build the Release

Dispatch from the tag. On a tag the run refuses a tag that disagrees with `package.json` and a `CHANGELOG.md` whose top heading has no date, and requires the macOS app to be signed, notarized and stapled (`sign=yes`). It then creates a **draft** Release carrying the archives, `SHA256SUMS` and generated notes; nothing is public yet. `upload_release=true` from anything but a `v*` tag fails the run rather than skipping the Release quietly.

```bash
RUN=$(gh workflow run release.yml --ref "${TAG:?}" -f upload_release=true | sed 's|.*/||')
gh run watch "${RUN:?}" --exit-status
```

### 6. Publish

Open the draft on the [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) page, check that the macOS `.app.tar.gz` (universal), the two Windows `.zip` (x86_64 and arm64) and `SHA256SUMS` are attached, edit the notes, choose **Set as a pre-release** or **Set as the latest release** (a tag with a `-` can be either), and **Publish release**. Publishing also starts `pages.yml`, which deploys the [documentation site](https://cri-middleware.github.io/SSConverterGUI/); merging to `main` publishes nothing, because the site documents the released application. Watch the run through, then open the site: a failed run leaves the Release published and the site as it was. Once the cause is fixed, re-run it; a re-run builds the same tag.

```bash
RUN=$(gh run list -w pages.yml -b "${TAG:?}" -L 1 --json databaseId -q '.[0].databaseId')
gh run watch "${RUN:?}" --exit-status             # RUN is empty for the few seconds before the run appears
```

### 7. Merge back

Merge `main` into `develop`. After a patch release this conflicts where `develop` has moved on: keep `develop`'s version and its `Unreleased` heading, with the patch's section below it. When the next version is decided, set it on `develop` the way step 2 does, under a `## [X.Y.Z] - Unreleased` heading.

```bash
git switch develop && git pull --ff-only
git merge --no-ff main && git push origin develop
git push origin --delete "$BRANCH"
```

If the button on its pull request already deleted the release branch, the last line only reports that the branch does not exist. Nothing needs it afterwards: a patch release cuts it again from the tag.

## Undoing a release

Until the Release is published, it can be undone. A run that failed for a transient reason is dispatched again from the same tag once its draft is deleted. A fault that needs new commits takes the tag down too: delete the draft, run `git push origin ":refs/tags/$TAG" && git tag -d "$TAG"`, fix it on the branch — restore it from its pull request if it was deleted — and go back to step 3.

**Once published, the tag and its assets are permanent** — users have the archives, and the version the app shows names them — so a fix is a new patch version.

## Building the archives locally

`release.yml` runs nothing but `scripts/build-release.sh` and its `.ps1` twin — for the macOS build, for each Windows build and for the final check — so the archives a release carries can be built and checked on your own machine. How, and what `sign=` and `build=no` do, is in section 5 of the [Development guide](./docs/en/development.md).

<br>

---

# SSConverter GUI のリリース手順

維持者向けです。コントリビューターがこの手順を実行することはありません（[CONTRIBUTING.md](./CONTRIBUTING.md) と、アプリ、リリース用アーカイブ、ドキュメントサイトのビルドを扱う[開発ガイド](./docs/ja/development.md)を参照してください）。

## リリースの手順

このリポジトリの Write ロールを持つ人なら誰でもリリースできます。どの手順もブランチ・プルリクエスト・タグ・ワークフローの実行・Release のいずれかで、署名の資格情報は組織の Secret なので、誰の手元で実行しても結果は変わりません。必要なのは `git`、`gh` 2.87 以降（最初に一度 `gh auth login`）、Node.js、Rust ツールチェーンです。コマンドは bash で書いています。Windows では Git Bash で実行してください。

リリースは `main` 上のタグです。先にタグを push し、ビルドはその後です。3 つのバージョンを一緒に動かします。基準は `package.json` の `version` で、`tauri.conf.json` がこれを読み、アプリが表示し、各アーカイブの名前になり、`scripts/release-version.sh` が出力します。`src-tauri/Cargo.toml` のクレート `version` はその写しで、同じ手順で動かします。2 つが食い違っている間、`scripts/release-version.sh` はバージョンを出力せずに失敗します。タグはその頭に `v` を付けたもので、食い違うタグはリリースビルドが拒否します。同梱する SDK のバージョンはこれとは別で、submodule が決めます。ブランチは git-flow です。`develop` が統合ブランチで、`main` にはリリース済みのコミットだけが入ります。`release/X.Y` は 1 回のリリースの間だけ使います。新しい `X.Y` なら `develop` から、パッチならその系統の最新のタグから切り、リリースが済んだら消します。

```bash
VERSION=7.0.1                                       # リリースするバージョン
BRANCH=release/$(echo "$VERSION" | cut -d. -f1,2)   # release/7.0
```

### 1. ブランチ

新しい `X.Y` は `develop` から切ります。パッチリリースは、以前の `release/X.Y` が残っているかどうかに関係なく、その系統の最新のタグから切り、修正をそこへコミットするか cherry-pick します。

```bash
git fetch origin
git switch -c "$BRANCH" origin/develop           # 新しい X.Y
git switch -C "$BRANCH" v7.0.0                   # パッチリリース: その系統の最新のタグ
```

### 2. SDK、バージョン、CHANGELOG

1 コミットで行います。変換処理は `SpriteStudio-SDK` submodule からビルドする `ssconverter` クレートなので、submodule がこのリリースに同梱する SDK です。その SDK リリースのタグに submodule を合わせます。`package.json` と `src-tauri/Cargo.toml` にバージョンを設定し、両方に合わせて `src-tauri/Cargo.lock` を cargo に書き直させます（CI の clippy は `--locked` で実行します）。続けて `CHANGELOG.md` のそのバージョンの見出しに日付を入れ、`## [X.Y.Z] - YYYY-MM-DD` とします。パッチリリースでは見出しと、ファイル末尾のリンク行を足します。

```bash
SDK_TAG=v7.0.0                                   # 同梱する SDK のリリース
git -C SpriteStudio-SDK fetch --tags origin && git -C SpriteStudio-SDK checkout "$SDK_TAG"
export VERSION
npm pkg set version="$VERSION"
perl -pi -e 's/^version = ".*"/version = "$ENV{VERSION}"/' src-tauri/Cargo.toml
cargo update -p ssconverter-gui --manifest-path src-tauri/Cargo.toml
# CHANGELOG.md の見出しに日付を入れてから:
git diff
git add SpriteStudio-SDK package.json src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md
git commit -m "chore(release): v$VERSION"
```

### 3. プルリクエストと QA ビルド

`main` へのプルリクエストを作ります。その CI がユニットテスト、フロントエンドのビルド、`cargo fmt`、clippy を実行します。続けてブランチからリリースワークフローを実行します。`upload_release` を false のままにすると、macOS と 2 つの Windows のアーカイブをリリースと同じようにビルド・署名・検査して run に残し（`SSConverterGUI-release-dist`）、Release は作りません。そのアーカイブのアプリを両方の OS で試してください。問題があればブランチで直し、両方の run が緑になるまで繰り返します。

```bash
git push -u origin "$BRANCH"
gh pr create -B main --title "Release v$VERSION" --body ""
RUN=$(gh workflow run release.yml --ref "$BRANCH" | sed 's|.*/||')
gh run watch "${RUN:?}" --exit-status
gh run download "${RUN:?}" -n SSConverterGUI-release-dist -D qa
```

署名の Secret が欠けていても、この run は失敗しません。macOS のジョブが `Skipping code signing` や `Skipping notarization` をログに出し、未署名のアプリを作ります。手順 5 のタグの run は署名を必須にしていて、そこで失敗することになるので、ここでその行が出ていないかを確認してください。

### 4. マージとタグ

マージはマージコミットで行い、squash や rebase は使いません。QA ビルドしたコミットの写しではなく、そのものを `main` に残すためです。タグは、`main` のツリーが QA ビルドしたものと同じときにだけ打ちます。違うのは `main` にブランチが持たないコミットがあった場合だけで、そのときは `main` をブランチへマージして手順 3 に戻ります。

```bash
gh pr merge "$BRANCH" --merge
git switch main && git pull --ff-only
git diff --stat HEAD^2 HEAD                           # 何も出力されないこと
TAG=v$(scripts/release-version.sh) && echo "$TAG"
git tag -a "$TAG" -m "$TAG" && git push origin "$TAG"
```

### 5. Release のビルド

タグからワークフローを実行します。タグの run は、`package.json` と食い違うタグと、先頭の見出しに日付の無い `CHANGELOG.md` を拒否し、macOS のアプリが署名・公証・ステープル済みであることを要求します（`sign=yes`）。そのうえで、アーカイブと `SHA256SUMS`、自動生成のリリースノートを持つ**下書き**の Release を作ります。まだ何も公開されていません。`v*` タグ以外からの `upload_release=true` は、Release を黙って飛ばさずに実行を失敗させます。

```bash
RUN=$(gh workflow run release.yml --ref "${TAG:?}" -f upload_release=true | sed 's|.*/||')
gh run watch "${RUN:?}" --exit-status
```

### 6. 公開

[Releases](https://github.com/cri-middleware/SSConverterGUI/releases) ページで下書きを開き、macOS の `.app.tar.gz`（ユニバーサル）、Windows の 2 つの `.zip`（x86_64 と arm64）、`SHA256SUMS` が添付されていることを確かめ、リリースノートを編集し、**Set as a pre-release** か **Set as the latest release** を選んで（`-` を含むタグはどちらも選べます）、**Publish release** を押します。公開すると `pages.yml` が動き、[ドキュメントサイト](https://cri-middleware.github.io/SSConverterGUI/) をデプロイします。`main` へのマージでは何も公開されません。サイトはリリース済みのアプリケーションを説明するものだからです。run を最後まで見届けてから、サイトを開いて確かめます。run が失敗しても Release は公開されたままで、サイトは元のまま残ります。原因を直したら run を再実行します。再実行は同じタグをビルドします。

```bash
RUN=$(gh run list -w pages.yml -b "${TAG:?}" -L 1 --json databaseId -q '.[0].databaseId')
gh run watch "${RUN:?}" --exit-status             # run が一覧に出るまでの数秒間は RUN が空になる
```

### 7. develop へ戻す

`main` を `develop` へマージします。パッチリリースの後は、`develop` が先へ進んだ箇所で衝突します。`develop` のバージョンと `Unreleased` の見出しを残し、パッチの節をその下に置いてください。次のバージョンが決まったら、手順 2 と同じやり方で `develop` にバージョンを設定し、`## [X.Y.Z] - Unreleased` の見出しを立てます。

```bash
git switch develop && git pull --ff-only
git merge --no-ff main && git push origin develop
git push origin --delete "$BRANCH"
```

プルリクエストのページのボタンでリリースブランチを消してあれば、最後の行は「ブランチが無い」と出るだけです。パッチリリースはタグから切り直すので、この後ブランチが要ることはありません。

## リリースの取り消し

Release を公開するまでは取り消せます。一時的な理由で失敗した run は、下書きを消してから同じタグでもう一度実行します。新しいコミットが要る不具合ならタグも取り下げます。下書きを消し、`git push origin ":refs/tags/$TAG" && git tag -d "$TAG"` を実行し、ブランチで直して（消していたらプルリクエストのページから復元して）手順 3 に戻ります。

**公開した後のタグとアセットは恒久的です。** 利用者はそのアーカイブを持っていて、アプリが表示するバージョンがそれを名指ししているので、修正は新しいパッチバージョンで出します。

## アーカイブのローカルビルド

`release.yml` が実行するのは、macOS のビルド、Windows の各ビルド、最後の検査のどれも `scripts/build-release.sh` と `.ps1` 版だけなので、リリースが持つアーカイブを手元のマシンでビルド・検査できます。やり方と、`sign=`・`build=no` の働きは、[開発ガイド](./docs/ja/development.md)の 5 節にあります。
