<!--
Thanks for contributing! See CONTRIBUTING.md for the constraints this project works under
(no `.sspj` parsing or binary generation here, vanilla TypeScript, nothing committed inside the SDK submodule).
CONTRIBUTING.md に本プロジェクトの制約が記載されています。日本語でも英語でも構いません。
-->

## What does this change? / 変更内容

<!-- What it does and why. Link any related issue: Fixes #123 -->

## How was it verified? / 検証方法

<!--
Which checks ran, and on what. If you could not run them, say so —
that is useful information, not a problem.
実行した確認と環境。実行できなかった場合はその旨をお書きください。
-->

- [ ] `pnpm test` — frontend helpers only; it reaches neither the Rust backend nor a conversion
- [ ] `pnpm run build`, then in `src-tauri/`: `cargo fmt --all -- --check`, `cargo clippy -p ssconverter-gui --all-targets --locked -- -D warnings` and `cargo test -p ssconverter-gui --locked`
- [ ] `pnpm run tauri dev` — checked the affected UI flow / 影響する UI 操作を確認した
- [ ] Converted a real `.sspj` (single file and/or folder) / 実際の `.sspj` で変換を確認した
- [ ] Not run — see notes below / 未実行（理由は下記）

**Environment / 環境:** OS and architecture (macOS on Apple silicon or Intel, Windows 10 / 11)

## Checklist

- [ ] Scoped to one thing. Unrelated fixes are easier to review as their own PR.
- [ ] Follows the style of the files it touches.
- [ ] Docs updated if behaviour changed.
- [ ] Anything that exists twice changed twice — a page and its translation, a `.sh` and its `.ps1`.
- [ ] No conversion logic here: core changes go to SpriteStudio-SDK, and nothing is committed inside the submodule.
- [ ] No frontend framework: vanilla TypeScript, no inline styles, styling in `src/style.css`.
- [ ] `package.json` and `src-tauri/Cargo.toml` versions kept in sync, if bumped.

## Anything reviewers should know? / レビュー時の注意点

<!-- Trade-offs you made, alternatives you rejected, parts you are unsure about. -->
