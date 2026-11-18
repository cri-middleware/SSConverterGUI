# Releasing SSConverter GUI

Maintainers only. Contributors do not run any of this — see [CONTRIBUTING.md](./CONTRIBUTING.md)
and the [Development guide](./docs/en/development.md), which covers building the app, a release
archive and the documentation site.

## Cutting a release

Anyone with the Write role on this repository can cut a release: every step is a branch, a pull request, a tag, a workflow run or a Release, and the signing credentials are organization secrets, so nothing depends on whose machine runs it. You need `git`, `gh` 2.87 or later (run `gh auth login` once), Node.js and a Rust toolchain. The repository needs GitHub Pages enabled with GitHub Actions as its source, and a `v*` tag rule on its `github-pages` environment, or publishing a Release deploys nothing; both are settings a repository admin makes. The commands are bash: in zsh, run `setopt interactive_comments` first, so that the `#` comments are not taken as arguments; on Windows, use Git Bash. Steps 1, 4 and 7 switch branches, so run them in a checkout of their own — a clone, or one made with `git worktree add` — not in one where other work is going on.

A release is a tag on `main`, pushed first and built second. Three versions move together. `version` in `package.json` is the one that counts: `tauri.conf.json` reads it, the app shows it, every archive is named after it, and `scripts/release-version.sh` prints it. The crate `version` in `src-tauri/Cargo.toml` is a copy that moves in the same step, and `scripts/release-version.sh` refuses to print a version while the two disagree. The tag is `v` followed by it, and the release build refuses a tag that disagrees. The SDK this release ships is versioned on its own, by the submodule. Branches follow git-flow: `develop` integrates, `main` holds released commits only, and `release/X.Y` lives for one release — cut from `develop` when the release ships `develop`'s work, or from the line's latest tag when it ships only fixes on top of it, and deleted once the release is out.

Every block runs as written in a new shell: it works out what it needs from the checkout, git and GitHub. The value set by hand is the version being released, written `<version>` in steps 1 and 2 — fill it in, as in `7.0.1`; left as it is, the line stops with a syntax error. A value that would not stop a command by itself when empty is read as `${VAR:?}`: an empty `VERSION` in step 2 would write an empty version, and an empty `RUN` would let the signing check in step 3 print nothing and pass.

An agent can run every block, but a person tries the QA build's app and sorts the scan's summary in step 3, and two steps are a person's to decide: the merge in step 4, which puts the release on `main`, and step 6, which publishes it for good.

### 1. Branch

A release that ships `develop`'s work is cut from `develop`: a new `X.Y`, or `7.0.0` after `7.0.0-beta.1`. A patch release ships only fixes: it is cut from the line's latest tag, and its fixes are committed or cherry-picked onto it. Either way, an earlier `release/X.Y` that is still there is replaced. Run the block that fits.

For `develop`'s work:

```bash
VERSION=<version>
BRANCH=release/$(echo "${VERSION:?}" | cut -d. -f1,2)
git fetch origin &&
  git switch -C "$BRANCH" origin/develop
```

For a patch:

```bash
VERSION=<version>
BRANCH=release/$(echo "${VERSION:?}" | cut -d. -f1,2)
git fetch origin --tags &&
  BASE=$(git -c versionsort.suffix=- tag --list "v${BRANCH#release/}.*" --sort=-v:refname | head -n 1) &&   # the line's latest tag
  git switch -C "$BRANCH" "${BASE:?}"
```

Then bring the dependencies up to date, in a commit of its own: `pnpm update` and `cargo update` move `pnpm-lock.yaml` and `src-tauri/Cargo.lock`, which the app is built from, to the newest versions their ranges allow. Cargo reads the `ssconverter` path dependency, so the block initializes the submodule first. A new major version changes code, and goes in an ordinary pull request into `develop` of its own rather than here.

```bash
git submodule update --init SpriteStudio-SDK &&
  pnpm update &&
  cargo update --manifest-path src-tauri/Cargo.toml
git commit -m "chore(deps): update within their ranges" -- pnpm-lock.yaml package.json src-tauri/Cargo.lock   # nothing to commit when nothing moved
```

### 2. Version and changelog

In one commit. Set the version in `package.json` and `src-tauri/Cargo.toml`, and let cargo rewrite `src-tauri/Cargo.lock` for both — CI's clippy runs `--locked`. The SDK it ships is the commit of the `SpriteStudio-SDK` submodule — the converter is the `ssconverter` crate, a path dependency into it — and the app names the converter by that commit's version. Cargo reads that path dependency, so the block initializes the submodule first. `<version>` is the one from step 1.

```bash
VERSION=<version>
git submodule update --init SpriteStudio-SDK &&
  export VERSION="${VERSION:?}" &&
  npm pkg set version="$VERSION" &&
  perl -pi -e 's/^version = ".*"/version = "$ENV{VERSION}"/' src-tauri/Cargo.toml &&
  cargo update -p ssconverter-gui --manifest-path src-tauri/Cargo.toml
```

Then date the version's heading in `CHANGELOG.md` as `## [X.Y.Z] - YYYY-MM-DD`, adding the heading and its link line at the bottom of the file if the version has none yet, look over the change, and commit it:

```bash
git diff
git add package.json src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md
git commit -m "chore(release): v$(scripts/release-version.sh)"
```

### 3. Pull request and QA build

Open the pull request into `main`; its CI runs the unit tests, the frontend build, `cargo fmt`, clippy and the Rust tests, builds the app for macOS and Windows as `release.yml` does but unsigned, and builds the documentation site.

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git push -u origin "${BRANCH:?}"
gh pr create -B main -H "${BRANCH:?}" --title "Release v$(scripts/release-version.sh)" --body ""
```

Then dispatch the release workflow from the branch. A run from a branch builds, signs and checks the macOS archive and the Windows archives exactly as the release will, keeps them on the run (`SSConverterGUI-release-dist`), and creates no Release; the block downloads them into `qa/<run ID>`. **A person tries the app** from those archives, on macOS and on Windows. Fix anything on the branch and run this block again, until both runs are green and the app works.

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git push origin "${BRANCH:?}" &&
  RUN=$(gh workflow run release.yml --ref "${BRANCH:?}" | sed 's|.*/||') &&
  gh run watch "${RUN:?}" --exit-status &&
  gh run download "${RUN:?}" -n SSConverterGUI-release-dist -D "qa/$RUN" &&
  ! gh run view "${RUN:?}" --log | grep -E 'not set|Skipping' | grep -v 'echo '   # must print nothing
```

A missing signing secret does not fail this run: the macOS job logs `Skipping code signing` or `Skipping notarization` and builds an unsigned app. The block's signing check looks for those lines and must print nothing, because the tag run in step 5 requires the signature and fails instead. If it prints anything, no change on the branch fixes it: the organization's signing secrets are not reaching this repository. An organization owner decides which repositories they reach. Dispatch again once they do.

Last, scan the branch for code that carries someone else's copyright or license. `provenance.yml` runs ScanCode, which finds copyright and license notices, and keeps its report and a summary on the run (`provenance`); the block downloads them into `qa/<run ID>` and prints the summary. **A person sorts what the summary lists.** A notice of the earlier SpriteStudio Players and SDK marks our own code. Anything else is rewritten, unless its license, read at its source, is compatible with BSD-3-Clause and the code keeps the notice that license asks for. After any change on the branch, run the block again.

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git push origin "${BRANCH:?}" &&
  RUN=$(gh workflow run provenance.yml --ref "${BRANCH:?}" | sed 's|.*/||') &&
  gh run watch "${RUN:?}" --exit-status &&
  gh run download "${RUN:?}" -n provenance -D "qa/$RUN" &&
  cat "qa/$RUN/summary.md"
```

### 4. Merge and tag

Merge with a merge commit, never a squash or a rebase, so that `main` keeps the commits the QA build built rather than copies of them. Before merging, check that a QA run built the branch's head green, and that merging it changes nothing in its tree. If it would, `main` holds changes the branch does not, and the tag would go on a tree no QA run built: merge `main` into the branch and go back to step 3. The block below fails when either check does not hold.

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git fetch origin &&
  SHA=$(git rev-parse --verify -q "origin/${BRANCH:?}") &&
  gh run list -w release.yml -c "${SHA:?}" -s success -L 1 | grep . &&                                             # must list a run
  git diff --exit-code --stat "origin/${BRANCH:?}" "$(git merge-tree --write-tree origin/main "origin/$BRANCH")"   # must print nothing
```

**A person runs the merge**, which puts the release on `main`: choose **Create a merge commit** on the pull request's page, or run

```bash
BRANCH=$(git branch --show-current | grep '^release/')
gh pr merge "${BRANCH:?}" --merge
```

Then tag `main`. The tag goes on the merge commit only when its tree is the branch's, which `git diff` confirms by printing nothing:

```bash
git switch main && git pull --ff-only &&
  git diff --stat --exit-code HEAD^2 HEAD &&
  TAG=v$(scripts/release-version.sh) &&
  git tag -a "$TAG" -m "$TAG" && git push origin "$TAG"
```

### 5. Build the Release

Dispatch from the tag on `main`. On a tag the run refuses a tag that disagrees with `package.json` and a `CHANGELOG.md` whose top heading has no date, and requires the macOS app to be signed, notarized and stapled (`sign=yes`). It then creates a **draft** Release carrying the archives, `SHA256SUMS` and generated notes; nothing is public yet. A tag that already has a Release, draft or published, keeps it as it is: the run builds, says so in a notice and creates nothing, so delete a draft before dispatching again ([Undoing a release](#undoing-a-release)). With `-f upload_release=false` a run from the tag only builds, its files kept on the run.

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
RUN=$(gh workflow run release.yml --ref "${TAG:?}" -f upload_release=true | sed 's|.*/||')
gh run watch "${RUN:?}" --exit-status
```

### 6. Publish

**A person runs this step**: the notes are a judgment, and a published Release is permanent. Open the draft on the [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) page, check that the macOS `.tar.gz` (universal), the Windows `.zip` (x86_64 and arm64) and `SHA256SUMS` are attached, edit the notes, and **Publish release** as the draft is marked: `scripts/release-channel.sh` made it a pre-release when a full release is already tagged, and left it to become Latest otherwise. Only a Release that becomes Latest deploys the site.

Publishing also starts `pages.yml`, which deploys the [documentation site](https://cri-middleware.github.io/SSConverterGUI/); merging to `main` publishes nothing, because the site documents the released application. Watch the run through, then open the site; the block waits up to a minute for the run, which appears a few seconds after the Release is published. A failed run leaves the Release published and the site as it was. Once the cause is fixed, re-run it with `gh run rerun <run-id>`, the run the block watched; a re-run builds the same tag.

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  RUN=$(gh run list -w pages.yml -b "${TAG:?}" -L 1 --json databaseId -q '.[0].databaseId')
  [ -n "$RUN" ] && break
  sleep 5
done
gh run watch "${RUN:?}" --exit-status
```

### 7. Merge back

Merge `main` into `develop`. After a patch release this conflicts where `develop` has moved on: keep `develop`'s version and its `Unreleased` heading, with the patch's section below it. The block merges on a detached `origin/develop`, so it runs in a worktree whichever branch the other checkouts hold, and a conflict stops it there: resolve it, `git commit`, and run the block's two `git push` lines. When the next version is decided, set it on `develop` the way step 2 does, under a `## [X.Y.Z] - Unreleased` heading.

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
git switch --detach origin/develop &&
  git merge --no-ff -m "Merge branch 'main' into develop" origin/main &&
  git push origin HEAD:develop &&
  git push origin --delete "release/$(echo "${TAG:?}" | sed 's/^v//' | cut -d. -f1,2)"
```

If the button on its pull request already deleted the release branch, the last line only reports that the branch does not exist. Nothing needs it afterwards: the line's next release cuts it again in step 1.

## Patching an earlier line

Fixes go to the latest release (SECURITY.md). When one has to reach an earlier line on request, as 7.0.2 after 7.1.0, `main` and `develop` carry the newer line, so the release differs from the one above in four places, and the blocks below run on the release branch.

1. **Steps 1 to 3, without the pull request.** Step 1's patch block cuts `release/X.Y` from the line's latest tag. Commit or cherry-pick the fix onto it, set the version and date its changelog section as step 2 does, and run step 3 but leave out its `gh pr create`: nothing of this line goes into `main`.
2. **The tag goes on the branch.** Once step 3's runs are green, the first block below tags the head of `release/X.Y`.
3. **Build it, and publish it as an earlier line.** `scripts/release-channel.sh` calls the release `old`: the draft is not a pre-release, its generated notes start from the full release before it in that line, and `pages.yml` deploys nothing for it. Publish the Release with the last block, not from the Releases page, whose default would make it Latest.
4. **No merge back.** Cherry-pick the fix onto `develop` if it still needs it; the last block deletes `release/X.Y`.

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git pull --ff-only origin "${BRANCH:?}" &&
  TAG=v$(scripts/release-version.sh) &&
  git tag -a "$TAG" -m "$TAG" && git push origin "$TAG"
```

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' HEAD)
RUN=$(gh workflow run release.yml --ref "${TAG:?}" -f upload_release=true | sed 's|.*/||')
gh run watch "${RUN:?}" --exit-status
```

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' HEAD)
BRANCH=$(git branch --show-current | grep '^release/')
gh release edit "${TAG:?}" --draft=false --latest=false &&
  git push origin --delete "${BRANCH:?}"
```

## Undoing a release

Until the Release is published, it can be undone. The draft goes first, if the run made one:

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
gh release delete "${TAG:?}" --yes
```

A run that failed for a transient reason is then dispatched again from the same tag, with step 5's block. A fault that needs new commits takes the tag down too, on GitHub and here; then fix it on the branch — restore it from its pull request if it was deleted — and go back to step 3.

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
git push origin ":refs/tags/${TAG:?}" && git tag -d "${TAG:?}"
```

**Once published, the tag and its assets are permanent** — users have the archives, and the version the app shows names them — so a fix is a new patch version.

## Building the archives locally

`release.yml` runs nothing but `scripts/build-release.sh` and its `.ps1` twin — for the macOS build, for each Windows build and for the final check — so the archives a release carries can be built and checked on your own machine. How, and what `sign=` and `build=no` do, is in section 5 of the [Development guide](./docs/en/development.md).

<br>

---

# SSConverter GUI のリリース手順

維持者向けです。コントリビューターがこの手順を実行することはありません（[CONTRIBUTING.md](./CONTRIBUTING.md) と、アプリ、リリース用アーカイブ、ドキュメントサイトのビルドを扱う[開発ガイド](./docs/ja/development.md)を参照してください）。

## リリースの手順

このリポジトリの Write ロールを持つ人なら誰でもリリースできます。どの手順もブランチ・プルリクエスト・タグ・ワークフローの実行・Release のいずれかで、署名の資格情報は組織の Secret なので、誰の手元で実行しても結果は変わりません。必要なのは `git`、`gh` 2.87 以降（最初に一度 `gh auth login`）、Node.js、Rust ツールチェーンです。リポジトリ側では、GitHub Pages を有効にしてソースを GitHub Actions にし、`github-pages` environment に `v*` のタグのルールを足しておく必要があります。どちらかが欠けると、Release を公開しても何もデプロイされません。どちらもリポジトリの admin が行う設定です。コマンドは bash です。zsh では、`#` のコメントが引数として渡されないよう、先に `setopt interactive_comments` を実行します。Windows では Git Bash を使います。手順 1・4・7 はブランチを切り替えるので、ほかの作業をしていない専用のチェックアウト（クローンか、`git worktree add` で作ったもの）で実行してください。

リリースは `main` 上のタグです。先にタグを push し、ビルドはその後です。3 つのバージョンを一緒に動かします。基準は `package.json` の `version` で、`tauri.conf.json` がこれを読み、アプリが表示し、各アーカイブの名前になり、`scripts/release-version.sh` が出力します。`src-tauri/Cargo.toml` のクレート `version` はその写しで、同じ手順で動かします。2 つが食い違っている間、`scripts/release-version.sh` はバージョンを出力せずに失敗します。タグはその頭に `v` を付けたもので、食い違うタグはリリースビルドが拒否します。同梱する SDK のバージョンはこれとは別で、submodule が決めます。ブランチは git-flow です。`develop` が統合ブランチで、`main` にはリリース済みのコミットだけが入ります。`release/X.Y` は 1 回のリリースの間だけ使います。`develop` の作業を出すリリースなら `develop` から、タグの上に修正だけを載せるリリースならその系統の最新のタグから切り、リリースが済んだら消します。

どのブロックも、新しいシェルで書かれたとおりに実行できます。必要なものはチェックアウト・git・GitHub から求めます。手で設定する値は、リリースするバージョン（手順 1 と 2 の `<version>`）だけです。`7.0.1` のように埋めてください。埋めずに実行すると、その行は構文エラーで止まります。空でもそれだけでは止まらない値は `${VAR:?}` で読みます。手順 2 の `VERSION` が空だと空のバージョンを書き込み、`RUN` が空だと手順 3 の署名の確認が何も出力せずに通ってしまうためです。

どのブロックもエージェントに実行させられますが、手順 3 の QA ビルドのアプリは人が試し、検査の一覧は人が仕分け、2 つの手順は人が判断します。リリースを `main` に入れる手順 4 のマージと、取り消せない公開を行う手順 6 です。

### 1. ブランチ

`develop` の作業を出すリリースは `develop` から切ります。新しい `X.Y` や、`7.0.0-beta.1` の後の `7.0.0` がこれに当たります。パッチリリースは修正だけを出すもので、その系統の最新のタグから切り、修正をそこへコミットするか cherry-pick します。どちらの場合も、以前の `release/X.Y` が残っていれば置き換えます。当てはまる方のブロックを実行します。

`develop` の作業を出すとき:

```bash
VERSION=<version>
BRANCH=release/$(echo "${VERSION:?}" | cut -d. -f1,2)
git fetch origin &&
  git switch -C "$BRANCH" origin/develop
```

パッチのとき:

```bash
VERSION=<version>
BRANCH=release/$(echo "${VERSION:?}" | cut -d. -f1,2)
git fetch origin --tags &&
  BASE=$(git -c versionsort.suffix=- tag --list "v${BRANCH#release/}.*" --sort=-v:refname | head -n 1) &&   # その系統の最新のタグ
  git switch -C "$BRANCH" "${BASE:?}"
```

続けて依存を最新にし、単独のコミットにします。`pnpm update` と `cargo update` は、アプリのビルドに使う `pnpm-lock.yaml` と `src-tauri/Cargo.lock` を、範囲が許すいちばん新しい版に上げます。cargo は `ssconverter` のパス依存を読むので、ブロックは先に submodule を初期化します。メジャーバージョンを上げるのはコードの変更なので、ここではなく`develop` への通常のプルリクエストで行います。

```bash
git submodule update --init SpriteStudio-SDK &&
  pnpm update &&
  cargo update --manifest-path src-tauri/Cargo.toml
git commit -m "chore(deps): update within their ranges" -- pnpm-lock.yaml package.json src-tauri/Cargo.lock   # 何も動かなければコミットするものは無い
```

### 2. バージョン、CHANGELOG

1 コミットで行います。`package.json` と `src-tauri/Cargo.toml` にバージョンを設定し、両方に合わせて `src-tauri/Cargo.lock` を cargo に書き直させます（CI の clippy は `--locked` で実行します）。同梱する SDK は `SpriteStudio-SDK` submodule のコミットです（変換処理の `ssconverter` クレートは、この submodule へのパス依存）。アプリはそのコミットのバージョンで変換器を名乗ります。cargo がこのパス依存を読むので、ブロックは先に submodule を初期化します。`<version>` は手順 1 と同じものです。

```bash
VERSION=<version>
git submodule update --init SpriteStudio-SDK &&
  export VERSION="${VERSION:?}" &&
  npm pkg set version="$VERSION" &&
  perl -pi -e 's/^version = ".*"/version = "$ENV{VERSION}"/' src-tauri/Cargo.toml &&
  cargo update -p ssconverter-gui --manifest-path src-tauri/Cargo.toml
```

続けて `CHANGELOG.md` のそのバージョンの見出しに日付を入れ、`## [X.Y.Z] - YYYY-MM-DD` とします。そのバージョンの見出しがまだ無ければ、見出しとファイル末尾のリンク行を足します。変更を見直してからコミットします。

```bash
git diff
git add package.json src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md
git commit -m "chore(release): v$(scripts/release-version.sh)"
```

### 3. プルリクエストと QA ビルド

`main` へのプルリクエストを作ります。その CI がユニットテスト、フロントエンドのビルド、`cargo fmt`、clippy、Rust のテストを実行し、`release.yml` と同じ手順で macOS と Windows のアプリを署名なしでビルドし、ドキュメントサイトをビルドします。

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git push -u origin "${BRANCH:?}"
gh pr create -B main -H "${BRANCH:?}" --title "Release v$(scripts/release-version.sh)" --body ""
```

続けて、ブランチからリリースワークフローを実行します。ブランチからの実行では、macOS と Windows のアーカイブをリリースと同じようにビルド・署名・検査して run に残し（`SSConverterGUI-release-dist`）、Release は作りません。ブロックはそれを `qa/<run の ID>` にダウンロードします。**そのアーカイブのアプリは人が試します。** macOS と Windows の両方で試してください。問題があればブランチで直し、このブロックをもう一度実行します。両方の run が緑になり、アプリが動くまで繰り返します。

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git push origin "${BRANCH:?}" &&
  RUN=$(gh workflow run release.yml --ref "${BRANCH:?}" | sed 's|.*/||') &&
  gh run watch "${RUN:?}" --exit-status &&
  gh run download "${RUN:?}" -n SSConverterGUI-release-dist -D "qa/$RUN" &&
  ! gh run view "${RUN:?}" --log | grep -E 'not set|Skipping' | grep -v 'echo '   # 何も出力されないこと
```

署名の Secret が欠けていても、この run は失敗しません。macOS のジョブが `Skipping code signing` や `Skipping notarization` をログに出し、未署名のアプリを作ります。ブロックの署名の確認はその行を探すもので、何も出力されてはいけません。手順 5 のタグの run は署名を必須にしていて、そこで失敗することになるためです。何か出力されたら、ブランチをどう変えても直りません。組織の署名用 Secret がこのリポジトリに届いていません。どのリポジトリに届けるかは組織のオーナーが決めます。届くようになったら実行し直してください。

最後に、他者の著作権やライセンスの付いたコードが無いかを、ブランチで検査します。`provenance.yml` は ScanCode で著作権表示とライセンスの記述を見つけ、報告と一覧を run に残します（`provenance`）。ブロックはそれを `qa/<run の ID>` にダウンロードし、一覧を表示します。**一覧は人が仕分けます。** 以前の SpriteStudio の Player・SDK の表示が付いたコードは、自社のコードです。それ以外は書き直します。残せるのは、出所で確かめたライセンスが BSD-3-Clause と両立し、そのライセンスが求める表示をコードに残すときだけです。ブランチを変えたら、このブロックをもう一度実行します。

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git push origin "${BRANCH:?}" &&
  RUN=$(gh workflow run provenance.yml --ref "${BRANCH:?}" | sed 's|.*/||') &&
  gh run watch "${RUN:?}" --exit-status &&
  gh run download "${RUN:?}" -n provenance -D "qa/$RUN" &&
  cat "qa/$RUN/summary.md"
```

### 4. マージとタグ

マージはマージコミットで行い、squash や rebase は使いません。QA ビルドしたコミットの写しではなく、そのものを `main` に残すためです。マージの前に、ブランチの先頭を QA の run が緑でビルドしていること、マージしてもブランチのツリーが変わらないことを確かめます。変わるなら `main` にブランチの持たない変更があり、どの QA の run もビルドしていないツリーにタグが付きます。そのときは `main` をブランチへマージして手順 3 に戻ります。下のブロックは、どちらかが満たされなければ失敗します。

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git fetch origin &&
  SHA=$(git rev-parse --verify -q "origin/${BRANCH:?}") &&
  gh run list -w release.yml -c "${SHA:?}" -s success -L 1 | grep . &&                                             # run が 1 つ表示されること
  git diff --exit-code --stat "origin/${BRANCH:?}" "$(git merge-tree --write-tree origin/main "origin/$BRANCH")"   # 何も出力されないこと
```

**マージは人が行います。** リリースが `main` に入るためです。プルリクエストのページで **Create a merge commit** を選ぶか、次を実行します。

```bash
BRANCH=$(git branch --show-current | grep '^release/')
gh pr merge "${BRANCH:?}" --merge
```

続けて `main` にタグを打ちます。タグはマージコミットのツリーがブランチと同じときにだけ打たれます。`git diff` が何も出力しないことがその確認です。

```bash
git switch main && git pull --ff-only &&
  git diff --stat --exit-code HEAD^2 HEAD &&
  TAG=v$(scripts/release-version.sh) &&
  git tag -a "$TAG" -m "$TAG" && git push origin "$TAG"
```

### 5. Release のビルド

`main` 上のタグからワークフローを実行します。タグの run は、`package.json` と食い違うタグと、先頭の見出しに日付の無い `CHANGELOG.md` を拒否し、macOS のアプリが署名・公証・ステープル済みであることを要求します（`sign=yes`）。そのうえで、アーカイブと `SHA256SUMS`、自動生成のリリースノートを持つ**下書き**の Release を作ります。まだ何も公開されていません。Release がすでにあるタグでは、下書きでも公開済みでも、その Release に触れません。run はビルドして notice を出すだけなので、もう一度実行するときは先に下書きを消します（[リリースの取り消し](#リリースの取り消し)）。`-f upload_release=false` を付けると、タグからの実行でもビルドだけを行い、成果物を run に残します。

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
RUN=$(gh workflow run release.yml --ref "${TAG:?}" -f upload_release=true | sed 's|.*/||')
gh run watch "${RUN:?}" --exit-status
```

### 6. 公開

**この手順は人が行います。** リリースノートの中身は判断が要り、公開した Release は取り消せないためです。[Releases](https://github.com/cri-middleware/SSConverterGUI/releases) ページで下書きを開き、macOS の `.tar.gz`（ユニバーサル）、Windows の `.zip`（x86_64 と arm64）、`SHA256SUMS` が添付されていることを確かめ、リリースノートを編集し、下書きの印のまま **Publish release** を押します。`scripts/release-channel.sh` が、正式版のタグがすでにあれば pre-release にし、なければ Latest になるようにしてあります。サイトをデプロイするのは Latest になる Release だけです。

公開すると `pages.yml` が動き、[ドキュメントサイト](https://cri-middleware.github.io/SSConverterGUI/) をデプロイします。`main` へのマージでは何も公開されません。サイトはリリース済みのアプリケーションを説明するものだからです。run を最後まで見届けてから、サイトを開いて確かめます。run は Release の公開から数秒遅れて出るので、ブロックは最大 1 分待ちます。run が失敗しても Release は公開されたままで、サイトは元のまま残ります。原因を直したら、ブロックが見届けた run を `gh run rerun <run-id>` で再実行します。再実行は同じタグをビルドします。

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  RUN=$(gh run list -w pages.yml -b "${TAG:?}" -L 1 --json databaseId -q '.[0].databaseId')
  [ -n "$RUN" ] && break
  sleep 5
done
gh run watch "${RUN:?}" --exit-status
```

### 7. develop へ戻す

`main` を `develop` へマージします。パッチリリースの後は、`develop` が先へ進んだ箇所で衝突します。`develop` のバージョンと `Unreleased` の見出しを残し、パッチの節をその下に置いてください。ブロックは切り離した `origin/develop` の上でマージするので、ほかのチェックアウトがどのブランチにあっても worktree で実行できます。衝突したらそこで止まります。解決して `git commit` し、ブロックの 2 つの `git push` を実行してください。次のバージョンが決まったら、手順 2 と同じやり方で `develop` にバージョンを設定し、`## [X.Y.Z] - Unreleased` の見出しを立てます。

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
git switch --detach origin/develop &&
  git merge --no-ff -m "Merge branch 'main' into develop" origin/main &&
  git push origin HEAD:develop &&
  git push origin --delete "release/$(echo "${TAG:?}" | sed 's/^v//' | cut -d. -f1,2)"
```

プルリクエストのページのボタンでリリースブランチを消してあれば、最後の行は「ブランチが無い」と出るだけです。同じ系統の次のリリースは手順 1 で切り直すので、この後ブランチが要ることはありません。

## 古い系統へのパッチ

修正は最新のリリースにだけ出します（SECURITY.md）。依頼を受けて古い系統を直すとき（7.1.0 の後の 7.0.2 など）は、`main` と `develop` が新しい系統を持っているので、上の手順と 4 か所が違います。下のブロックはリリースブランチで実行します。

1. **手順 1〜3 を、プルリクエストなしで。** 手順 1 のパッチのブロックで、その系統の最新のタグから `release/X.Y` を切ります。修正をコミットするか cherry-pick し、手順 2 のとおりにバージョンを設定して CHANGELOG の節に日付を入れ、手順 3 を `gh pr create` を除いて実行します。この系統のものは `main` に入れません。
2. **タグはブランチに打つ。** 手順 3 の run が通ったら、最初のブロックで `release/X.Y` の先頭にタグを打ちます。
3. **ビルドして、古い系統として公開する。** `scripts/release-channel.sh` がこのリリースを `old` と判定します。下書きは pre-release にならず、自動生成のノートはその系統の 1 つ前の正式版から比べ、`pages.yml` は何もデプロイしません。公開は Releases ページではなく最後のブロックで行います。ページの既定のままだと Latest になるためです。
4. **develop へは戻さない。** `develop` にも要る修正なら cherry-pick します。最後のブロックが `release/X.Y` を消します。

```bash
BRANCH=$(git branch --show-current | grep '^release/')
git pull --ff-only origin "${BRANCH:?}" &&
  TAG=v$(scripts/release-version.sh) &&
  git tag -a "$TAG" -m "$TAG" && git push origin "$TAG"
```

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' HEAD)
RUN=$(gh workflow run release.yml --ref "${TAG:?}" -f upload_release=true | sed 's|.*/||')
gh run watch "${RUN:?}" --exit-status
```

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' HEAD)
BRANCH=$(git branch --show-current | grep '^release/')
gh release edit "${TAG:?}" --draft=false --latest=false &&
  git push origin --delete "${BRANCH:?}"
```

## リリースの取り消し

Release を公開するまでは取り消せます。run が下書きを作っていれば、先にそれを消します。

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
gh release delete "${TAG:?}" --yes
```

一時的な理由で失敗した run は、そのあと手順 5 のブロックで同じタグからもう一度実行します。新しいコミットが要る不具合なら、タグも GitHub と手元の両方から取り下げ、ブランチで直して（消していたらプルリクエストのページから復元して）手順 3 に戻ります。

```bash
git fetch origin --tags
TAG=$(git describe --exact-match --tags --match 'v[0-9]*' origin/main)
git push origin ":refs/tags/${TAG:?}" && git tag -d "${TAG:?}"
```

**公開した後のタグとアセットは恒久的です。** 利用者はそのアーカイブを持っていて、アプリが表示するバージョンがそれを名指ししているので、修正は新しいパッチバージョンで出します。

## アーカイブのローカルビルド

`release.yml` が実行するのは、macOS のビルド、Windows の各ビルド、最後の検査のどれも `scripts/build-release.sh` と `.ps1` 版だけなので、リリースが持つアーカイブを手元のマシンでビルド・検査できます。やり方と、`sign=`・`build=no` の働きは、[開発ガイド](./docs/ja/development.md)の 5 節にあります。
