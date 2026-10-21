# didit 実装タスク（TASKS）

- 上から順に進めてください。**マイルストーンが終わるたびに作業を止め、報告してください**（報告の形式は [../AGENTS.md](../AGENTS.md) を参照）。
- 各マイルストーンの完了条件は、`npm run check` が成功していることを前提とします。

---

## M0：リポジトリの土台
| # | タスク |
|---|---|
| 0-1 | `package.json`（`type: module`、`bin: { didit: "dist/cli.js" }`、`engines.node: ">=20"`、`files: ["dist", "schema"]`） |
| 0-2 | TypeScript の設定（`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`）、tsup、Vitest、ESLint ＋ Prettier（または Biome） |
| 0-3 | npm スクリプト：`build`、`test`、`lint`、`typecheck`、`check`（lint ＋ typecheck ＋ test をまとめて実行） |
| 0-4 | `.github/workflows/ci.yml`（ubuntu／macos／windows × Node 20, 22）、`codeql.yml`、`dependabot.yml` |
| 0-5 | `LICENSE`（Apache-2.0）、`CODE_OF_CONDUCT.md`（Contributor Covenant 2.1）、`SECURITY.md`、仮の `README.md` |
| 0-6 | `docs/DECISIONS.md` を作る（形式は下の付録） |
| 0-7 | `test/helpers/repo.ts`：一時フォルダに git リポジトリを作り、ファイルの書き込み・コミット・後片付けができるヘルパー |

**完了条件：** `npm run check` が成功する。`node dist/cli.js --version` でバージョンが表示される。

---

## M1：v0.1 の中核（差分の解析、TS/JS 向けルール、テキストとJSON出力）
| # | タスク | 参照 |
|---|---|---|
| 1-1 | `git/exec.ts`：シェルを通さずに git を実行する。終了コードと標準エラー出力を含むエラー型 | SPEC 3, 12 |
| 1-2 | `git/range.ts`：base と current を決める（全モード、空ツリー、変更なし） | SPEC 4.3 |
| 1-3 | `git/diff.ts`、`diff/parse.ts`：変更ファイルの一覧、unified diff の解析、未追跡ファイル、名前の変更、バイナリの判定 | SPEC 6 |
| 1-4 | `diff/classify.ts`：言語とテストファイルの判定、除外 | SPEC 5, 6.3 |
| 1-5 | `rules/types.ts`、`rules/index.ts`、`rules/lib/`（パターン、数え上げ、対の作成） | SPEC 7.2 |
| 1-6 | v0.1 のルール：1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18（TS/JS） | RULES |
| 1-7 | `i18n/`（en／ja）と言語の決め方 | SPEC 10 |
| 1-8 | `report/text.ts`、`report/json.ts`、`schema/report.schema.json` | SPEC 9.1, 9.2 |
| 1-9 | `commands/check.ts`、`cli.ts`：オプション、終了コード、`--fail-on`、`--quiet`、色 | SPEC 4 |
| 1-10 | `commands/rules.ts`：ルールの一覧表示 | SPEC 4.1 |
| 1-11 | E2Eテスト：作業ツリー、`--staged`、`--base`、`--head`、変更なし、リポジトリの外 | SPEC 14 |
| 1-12 | 速さのテスト：50ファイル・2,000行を1秒以内 | SPEC 12 |

**完了条件**
- 各ルールに「検出すべき例」と「検出してはいけない例」が2件以上ずつある。
- E2Eテストで、JSON出力が `schema/report.schema.json` に適合する。
- 自分のリポジトリで `node dist/cli.js` を実行し、問題なく動く（結果を報告に貼る）。

---

## M2：v0.2 のルールと解除の仕組み
| # | タスク | 参照 |
|---|---|---|
| 2-1 | `config.ts`：`.didit.json` の読み込みと検証、CLIオプションとの統合 | SPEC 5 |
| 2-2 | `suppress.ts`：行単位・ファイル単位のコメント、設定の `ignore`、理由が必須、「この変更で追加された解除」の一覧 | SPEC 7.3 |
| 2-3 | Python 向けルール：3, 13, 18（Py） | RULES |
| 2-4 | 設定・CI 向けルール：14, 15, 16, 17 | RULES |
| 2-5 | ルール 19（テスト時だけ動作を変えるコード）、20（didit の設定変更） | RULES |
| 2-6 | didit 自身の `.didit.json`（`test/fixtures/**` を除外）を用意し、CI で didit 自身を検査する | SPEC 14 |

**完了条件：** RULES.md のルール 1〜20 がすべて実装されている。`didit-ok` を追加すると、解除されると同時に「この変更で追加された解除」に表示されることを、E2Eテストで確認している。

---

## M3：テストの実行と引き継ぎ資料
| # | タスク | 参照 |
|---|---|---|
| 3-1 | `run/runner.ts`：シェル経由の実行、出力の取り込み（上限 5MB、最後の50行を保持）、時間切れ時の終了処理（`run/kill.ts`） | SPEC 8.1 |
| 3-2 | `git/worktree.ts`：base 側の一時 worktree、`linkDirs` のリンク、`setup`、**必ず後片付けする**（SIGINT を含む） | SPEC 8.1 |
| 3-3 | `run/parsers/`：junit、vitest、jest、pytest（RULES の要約行の例をすべてテストする） | SPEC 8.2 |
| 3-4 | run ルール R1〜R3 | RULES |
| 3-5 | `report/markdown.ts` | SPEC 9.3 |
| 3-6 | `report/handoff.ts`：`handoff.md`、`handoff.json`、目的の取得元、「関連するテストの変更が見つからない」の推定 | SPEC 9.4 |

**完了条件：** 偽のテストコマンドを使ったE2Eテストで、R1〜R3 が検出される。テスト後に `git worktree list` に一時 worktree が残っていない。

---

## M4：AIエージェント連携
| # | タスク | 参照 |
|---|---|---|
| 4-1 | `didit init`（`.didit.json`、`.gitignore`） | SPEC 11.1 |
| 4-2 | `didit init claude／agents／cursor／copilot`：既存の設定を壊さない追記、マーカーで囲み何度実行しても重複しない | SPEC 11.1 |
| 4-3 | `didit hook claude`：標準入力の読み取り、`stop_hook_active`、終了コード 0／1／2、標準エラー出力への指摘 | SPEC 11.2 |
| 4-4 | Claude Code のフックの最新形式を公式ドキュメントで確認し、DECISIONS.md に記録する | SPEC 11.2 |

**完了条件：** 各 `init` を2回実行してもファイルの内容が変わらないことを、テストで確認している。`hook claude` の終了コードの3パターンをテストで確認している。

---

## M5：公開の準備
| # | タスク |
|---|---|
| 5-1 | `examples/demo/setup.sh`：デモ用のリポジトリを作り、「AIがごまかした変更」（`it.skip`、`toBe` → `toBeDefined`、`@ts-expect-error`、`--passWithNoTests`）を加える |
| 5-2 | `examples/demo/demo.tape`（charmbracelet/vhs 用）：README に載せるGIFを録画するための台本 |
| 5-3 | `README.md`（英語）と `README.ja.md`：冒頭のキャッチコピー → GIF → `npx didit` → 検出できるもの → AIエージェント連携 → 設定 → 解除 → FAQ（「ごまかしと決めつけるのか？」への回答を含む） |
| 5-4 | `CONTRIBUTING.md`：開発の始め方、ルールの追加手順（RULES.md の末尾から転記）、コミットの規約 |
| 5-5 | `docs/cheats.md`：AIのごまかし事例集（各ルールにつき1つ以上の例） |
| 5-6 | Issue テンプレート：不具合、新しいルールの提案、誤検出の報告 |
| 5-7 | `good first issue` 用のルール案を5つ、`docs/rule-ideas.md` に書く（例：Go 向けの `t.Skip()`、Rust 向けの `#[ignore]`、`console.error` の削除、`@Disabled`（JUnit）、`assert` の削除） |
| 5-8 | `CHANGELOG.md`、`npm pack` を使った確認（SPEC 15-7） |
| 5-9 | `.pre-commit-hooks.yaml`：pre-commit フレームワーク用のフック定義（`id: didit`、`language: node`、`entry: didit --staged`、`pass_filenames: false`）。README に使い方を追記する |
| 5-10 | `docs/launch/social-preview.svg`：ソーシャルプレビュー用の画像（1280×640）。ツール名、キャッチコピー、ターミナル風の出力例を入れる。PNG への変換は人間が行う |
| 5-11 | `docs/launch/` に公開用の文章の下書きを作る：`zenn.md`（日本語の記事）、`show-hn.md`、`x-posts.md`（日本語・英語各3案）、`reddit.md`、`devto.md`。内容は `docs/GROWTH.md` の例と構成に従う。**実体験の部分は `<!-- TODO: 実体験を書く -->` として空けておき、事例を作り上げない** |
| 5-12 | `docs/rule-ideas.md` の5案を、そのまま GitHub Issue にできる形式（タイトル、背景、検出すべき例、検出してはいけない例、`good first issue` ラベル）で書く |

**完了条件：** SPEC 15章の受け入れ基準をすべて満たす。npm への公開は **人間が行う**（AIは公開しない）。

---

## 付録：DECISIONS.md の形式
```markdown
## D-001 Lint ツールに ESLint + Prettier を採用
- 日付: 2026-10-21
- 関連: SPEC 3
- 決定: ...
- 理由: ...
- 検討した他の案: Biome（...のため見送り）
```
