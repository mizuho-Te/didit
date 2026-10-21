# didit 製品仕様書（SPEC）

- バージョン：v0.2 までの仕様（2026-10-21 作成）
- 読む人：このツールを実装するAIエージェント（および人間のレビュー担当者）
- 関連文書：[RULES.md](./RULES.md)（検出ルール一覧）／[TASKS.md](./TASKS.md)（実装手順）／[../AGENTS.md](../AGENTS.md)（実装する人向けの約束事）

> **文書の優先順位：** SPEC.md ＞ RULES.md ＞ TASKS.md。
> 仕様に書かれていない点や曖昧な点は、推測で決めてかまいません。ただし、その内容と理由を必ず `docs/DECISIONS.md` に記録してください。

---

## 1. 概要

### 1.1 一言で
**didit** は、AIコーディングエージェントが「テストが通った」状態を作るために行った **ごまかし**（テストのスキップ・削除、判定条件の緩和、型エラーの抑制、設定の緩和など）を、Git の差分から検出するローカルCLIです。オプションで変更前後のテストを実際に実行して比較し、次のAIへの引き継ぎ資料も出力します。

### 1.2 目的
- AIが作業を終えた直後に、人が確認すべき箇所を **1秒以内** に示す。
- 「実際に確認したこと」と「確認していないこと」を、実行結果を根拠に分けて示す。
- GitHub上のOSSとして、多くの開発者に使われ、貢献される。

### 1.3 目的に含めないこと
- コードの正しさを判定すること（didit が判定するのは「確認が弱くなったかどうか」だけ）。
- LLMを使った解析（v0.2 までは一切使わない）。
- 有料機能、アカウント、外部サーバーとの通信。

### 1.4 用語
| 用語 | 意味 |
|---|---|
| base | 比較の基準となる状態（コミット） |
| current | 検査対象の状態（作業ツリー、ステージ済みの内容、または指定コミット） |
| finding | ルールが検出した1件の指摘 |
| severity | 指摘の重要度：`high` / `medium` / `low` |
| suppression | `didit-ok` コメントや設定による指摘の解除 |
| run | `--run` で実行したテストコマンドの結果 |

---

## 2. 対象範囲

| バージョン | 内容 |
|---|---|
| **v0.1** | `check` コマンド、差分の取得と解析、TypeScript/JavaScript 向けルール、テキストとJSONの出力 |
| **v0.2** | Python・設定・CI 向けルール、解除の仕組み、設定ファイル、`--run`、引き継ぎ資料、Markdown出力、`init`／`hook` コマンド |
| v0.3 以降（今回は作らない） | GitHub Action、tree-sitter による構文解析、他言語への対応 |

---

## 3. 動作環境と技術的な制約

| 項目 | 指定 |
|---|---|
| 実行環境 | Node.js 20 以上 |
| OS | macOS、Linux、Windows（出力するパスは常に `/` 区切り） |
| 外部コマンド | `git` 2.30 以上（必須） |
| 言語 | TypeScript（`strict: true`、`noUncheckedIndexedAccess: true`）、ESM |
| ビルド | tsup |
| テスト | Vitest |
| Lint／整形 | ESLint（typescript-eslint）＋ Prettier。Biome でもよい（どちらを選んだかは DECISIONS.md に記録） |
| 実行時の依存 | 最小限にする。使ってよいもの：`commander`、`picocolors`、`zod`、`jsonc-parser`、`picomatch`、`fast-xml-parser`。それ以外を追加する場合は DECISIONS.md に理由を記録 |
| 配布 | npm パッケージ。コマンド名は `didit`（パッケージ名は公開前に空きを確認。決まるまでは仮に `didit` とする） |
| ネットワーク | **一切通信しない**（`--run` で利用者が指定したコマンドが通信する場合を除く） |

---

## 4. CLI仕様

### 4.1 コマンド一覧
```
didit [check] [options]     差分を検査する（既定のコマンド）
didit init [target]         設定ファイルやAIエージェント連携の設定を作る
didit hook <agent>          AIエージェントのフックから呼び出される
didit rules                 ルールの一覧を表示する
didit --version / --help
```

### 4.2 `check` のオプション
| オプション | 既定値 | 説明 |
|---|---|---|
| `--base <ref>` | なし | 比較の基準。指定すると `git merge-base <ref> HEAD` を base にする |
| `--head <ref>` | なし | 指定すると作業ツリーではなく、このコミットを current にする（CI向け） |
| `--staged` | false | ステージ済みの内容だけを current にする |
| `--run <command>` | 設定の `run` | テストコマンドを実行し、結果をレポートに含める |
| `--no-base-run` | false | `--run` のとき、base 側のテスト実行を省略する |
| `--junit <glob>` | 設定の `junit` | テスト実行後に JUnit XML を読み、件数を正確に取得する |
| `--timeout <sec>` | 600 | 1回のテスト実行の制限時間 |
| `--format <fmt>` | `text` | `text` / `json` / `markdown` |
| `--handoff` | false | 引き継ぎ資料を出力する |
| `--goal <text>` | なし | 引き継ぎ資料に書く作業の目的 |
| `--out-dir <dir>` | `.didit` | 引き継ぎ資料の出力先 |
| `--fail-on <level>` | `high` | `high` / `medium` / `low` / `none`。指定した重要度以上の指摘があれば終了コード 1 |
| `--lang <lang>` | 自動 | `en` / `ja` |
| `--quiet` | false | 集計の1行だけを表示する |
| `--no-color` | — | 色を付けない（環境変数 `NO_COLOR` があるとき、または出力先がTTYでないときも色を付けない） |
| `--config <path>` | `<repo>/.didit.json` | 設定ファイルの場所 |

- `--staged` と `--head` は同時に指定できません（終了コード 2）。
- `--run` だけは子プロセスをシェル経由で実行します。それ以外の外部コマンド（git）はシェルを通さず、引数を配列で渡して実行します。

### 4.3 base と current の決め方
| 指定 | base | current |
|---|---|---|
| なし | `HEAD` | 作業ツリー（ステージ済み、未ステージ、未追跡のファイル。`.gitignore` の対象は除く） |
| `--base <ref>` | `merge-base(<ref>, HEAD)` | 作業ツリー |
| `--staged` | `HEAD` | インデックス |
| `--base <ref> --head <h>` | `merge-base(<ref>, <h>)` | コミット `<h>` |
| `--head <h>` のみ | `<h>~1` | コミット `<h>` |

- コミットが1つもないリポジトリでは、base を空ツリー（`4b825dc642cb6eb9a060e54bf8d69288fbee4904`）とします。
- 変更がなければ、`No changes to check.`（日本語なら「検査する変更はありません」）と表示して終了コード 0。base を変えたい場合のために、`--base main` を使うヒントも表示します。
- Git リポジトリの外で実行した場合は、エラーメッセージを表示して終了コード 2。

### 4.4 終了コード
| コード | 意味 |
|---|---|
| 0 | `--fail-on` 以上の指摘がない（解除済みの指摘は数えない） |
| 1 | `--fail-on` 以上の指摘がある |
| 2 | 使い方の誤り、または実行時エラー（git がない、リポジトリではない、設定ファイルが不正など） |

`hook` コマンドの終了コードは、[11章](#11-aiエージェント連携) に従います。

---

## 5. 設定ファイル `.didit.json`

リポジトリのルートに置きます。JSONC 形式（コメントを書ける）です。`jsonc-parser` で読み込み、`zod` で検証します。不正な値があれば、どの項目が間違っているかを表示して終了コード 2。

```jsonc
{
  "failOn": "high",                 // "high" | "medium" | "low" | "none"
  "run": "npm test",                // --run の既定値
  "junit": "reports/junit.xml",     // --junit の既定値
  "lang": "ja",                     // "en" | "ja"
  "exclude": ["**/fixtures/**"],    // 既定の除外対象に追加される
  "testFilePatterns": [],           // 既定のテストファイル判定に追加される
  "rules": {                        // ルールの無効化や重要度の変更
    "any-added": "off",
    "ts-suppress-added": "high"
  },
  "ignore": [                       // ファイル単位の解除（理由は必須）
    { "rule": "test-file-deleted", "path": "tests/legacy/**", "reason": "旧APIの廃止に伴い削除" }
  ],
  "maxFileSizeKb": 1024,
  "timeoutSec": 600,
  "baseRun": {
    "enabled": true,
    "linkDirs": ["node_modules", ".venv", "venv"],
    "setup": null                   // 例: "npm ci"。指定すると linkDirs の代わりに base 側でこのコマンドを実行する
  }
}
```

- **優先順位：** CLIオプション ＞ 設定ファイル ＞ 既定値
- **既定の除外対象：** `node_modules/**`、`dist/**`、`build/**`、`coverage/**`、`.git/**`、`.didit/**`、`**/*.min.js`、`package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`bun.lockb`、`uv.lock`、`poetry.lock`

---

## 6. 差分の取得と解析

### 6.1 取得
- 変更ファイルの一覧：`git diff --name-status -z -M <base> [<head>|--cached]`
- 差分の本文：`git diff --no-color --no-ext-diff -M -U3 <base> [<head>|--cached]`
- 未追跡ファイル（作業ツリーモードのとき）：`git ls-files --others --exclude-standard -z`。内容をすべて「追加」として扱う。
- base 側の内容：`git show <baseSha>:<path>`
- current 側の内容：作業ツリーはファイルを読む。`--staged` は `git show :<path>`、`--head` は `git show <h>:<path>`。
- バイナリファイルと、`maxFileSizeKb` を超えるファイルは対象外にする（件数だけレポートに表示する）。

### 6.2 データ構造（参考）
```ts
type FileStatus = "added" | "modified" | "deleted" | "renamed";

interface DiffLine {
  type: "add" | "del" | "ctx";
  content: string;          // 先頭の +/-/空白 を除いた内容
  oldLine?: number;         // base 側の行番号（del / ctx）
  newLine?: number;         // current 側の行番号（add / ctx）
}

interface Hunk { oldStart: number; newStart: number; lines: DiffLine[]; }

interface FileDiff {
  path: string;             // current 側のパス（削除の場合は base 側のパス）
  oldPath?: string;         // 名前を変更した場合の元のパス
  status: FileStatus;
  hunks: Hunk[];
  isBinary: boolean;
  language: "ts" | "js" | "py" | "json" | "yaml" | "toml" | "other";
  isTestFile: boolean;
}
```

### 6.3 テストファイルの判定（既定値）
- TS/JS：`**/*.{test,spec}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}`、`**/__tests__/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}`
- Python：`**/test_*.py`、`**/*_test.py`、`**/tests/**/*.py`、`**/conftest.py`
- 設定の `testFilePatterns` を追加できます。

### 6.4 名前の変更
`-M` で検出した名前の変更は、削除として扱いません。内容に差分があれば modified と同様に検査します。

---

## 7. ルールエンジン

### 7.1 基本方針
- **差分で新しく入ったものだけを指摘する。** 以前からあった `@ts-ignore` などは対象外。
- 各ルールは独立したファイルに書き、1つの一覧（レジストリ）に登録する。
- 各ルールには、「検出すべき例」と「検出してはいけない例」のテストをそれぞれ2件以上付ける。

### 7.2 ルールのインターフェース（参考）
```ts
type Severity = "high" | "medium" | "low";
type Category =
  | "test-disabled" | "test-removed" | "assertion-weakened" | "expected-changed"
  | "suppression" | "config-weakened" | "ci-weakened" | "error-swallowed"
  | "test-env-branch" | "didit-config" | "run";

interface Finding {
  ruleId: string;
  severity: Severity;
  category: Category;
  file?: string;                       // 対象ファイル（run 系では省略）
  line?: number;                       // side が "added" なら current 側、"removed" なら base 側の行番号
  side: "added" | "removed" | "file" | "run";
  message: string;                     // 表示言語で書かれた説明
  before?: string;                     // 変更前の行（あれば）
  after?: string;                      // 変更後の行（あれば）
  suppressed?: { reason: string; source: "comment" | "config" };
}

interface RuleContext {
  file: FileDiff;
  getBaseContent(): Promise<string | null>;
  getCurrentContent(): Promise<string | null>;
  lang: "en" | "ja";
}

interface Rule {
  id: string;                          // kebab-case。公開後は変更しない
  defaultSeverity: Severity;
  category: Category;
  appliesTo(file: FileDiff): boolean;
  check(ctx: RuleContext): Promise<Omit<Finding, "severity">[]>;
  meta: {
    description: { en: string; ja: string };
    docsAnchor: string;                // RULES.md 内のアンカー
  };
}
```
重要度は「設定ファイルでの指定 → ルールの既定値」の順に決まります。`"off"` を指定したルールは実行しません。

### 7.3 解除（suppression）
1. **行単位のコメント：** current 側の同じ行、または直前の行に次のいずれかを書く。
   - `// didit-ok: <理由>`、`/* didit-ok: <理由> */`、`# didit-ok: <理由>`
   - 特定のルールだけを解除する場合：`didit-ok(<ruleId>): <理由>`
2. **ファイル単位・削除系の指摘：** current 側のファイル内のどこかに `didit-ok(<ruleId>): <理由>` があれば解除する。
3. **削除されたファイル：** 設定ファイルの `ignore` でだけ解除できる。
4. **理由は必須：** 理由が空の場合は解除せず、指摘に「理由がありません」と書き添える。

> [!IMPORTANT]
> **ごまかし検出をすり抜けるごまかしを防ぐ。**
> - 差分で **新しく追加された `didit-ok`** は、解除が成立した場合でも、レポートの「この変更で追加された解除」欄に必ず一覧表示する。
> - `.didit.json` 自体の変更は、`didit-config-changed` ルールで必ず指摘する（RULES.md 参照）。

---

## 8. テストの実行（`--run`）

### 8.1 流れ
1. **current 側の実行**：作業ツリーモードではリポジトリのルートで実行する。`--head` 指定時は、current も一時的な worktree で実行する。
2. **base 側の実行**（`--no-base-run` がなく、`baseRun.enabled` が true のとき）
   1. `git worktree add --detach <OSの一時フォルダ>/didit-<random> <baseSha>`
   2. `baseRun.setup` があればそれを実行する。なければ `linkDirs` に挙げたフォルダのうち、リポジトリに存在するものを worktree へシンボリックリンクする（Windows ではジャンクション）。
   3. テストコマンドを実行する。
   4. **成功・失敗・中断に関わらず、必ず** `git worktree remove --force` で後片付けする。SIGINT を受けた場合も同様。
3. 実行時の環境変数には、`CI=1` と `FORCE_COLOR=0` を加える。
4. 制限時間を超えた場合は、子プロセスをまとめて終了させる（POSIX では detached ＋プロセスグループへの kill、Windows では `taskkill /T /F`）。

### 8.2 件数の取得（優先順）
1. `--junit` が指定されていれば、JUnit XML を読む（`tests`、`failures`、`errors`、`skipped` の合計）。
2. 出力から読み取る。対応するのは Vitest、Jest、pytest の要約行（例は RULES.md の run ルールの項を参照）。
3. どちらでも取れなければ、終了コードだけを記録する（`parser: "none"`）。

### 8.3 結果のデータ
```ts
interface RunResult {
  side: "base" | "current";
  command: string;
  sha: string;                // current が作業ツリーのときは HEAD の SHA ＋ dirty: true
  dirty: boolean;
  startedAt: string;          // ISO 8601
  durationMs: number;
  exitCode: number | null;
  timedOut: boolean;
  parser: "junit" | "vitest" | "jest" | "pytest" | "none";
  counts?: { passed: number; failed: number; skipped: number; total: number };
  logTail: string;            // 出力の最後の50行
}
```
実行結果からの指摘（テストの失敗、件数の減少など）は、RULES.md の「run ルール」で定義します。

---

## 9. 出力

### 9.1 テキスト（既定）
表示の順序：
1. 見出し（比較範囲、変更ファイル数）
2. 重要度の高い順に指摘を表示（`ファイル:行`、説明、変更前 → 変更後）
3. この変更で追加された解除
4. テストの実行結果（base と current の比較）
5. 集計の1行と、次にとるべき行動のヒント

日本語での表示例：
```text
didit — HEAD...作業ツリー（変更 7 ファイル）

🚩 high 2件
  tests/cart.test.ts:18   テストがスキップされました [test-skip-added]
      - it("割引の上限", () => {
      + it.skip("割引の上限", () => {
  tests/cart.test.ts:31   判定条件が緩くなりました [assertion-weakened]
      - expect(total).toBe(900)
      + expect(total).toBeDefined()

⚠️  medium 1件
  src/order/total.ts:42   型エラーの抑制が追加されました（理由なし） [ts-suppress-added]

🔕 この変更で追加された解除 1件
  src/api/client.ts:10   didit-ok: 外部SDKの型定義の不具合のため

🧪 テスト実行: npm test
  base    (a1b2c3d)        48 成功 / 0 失敗 / 0 スキップ
  current (a1b2c3d+変更)   45 成功 / 0 失敗 / 3 スキップ   ← テスト数が減っています

結果: high 3 / medium 1 / low 0（解除 1）
意図した変更であれば、該当行に「// didit-ok: 理由」を書いてください。
```

### 9.2 JSON（`--format json`）
- 標準出力にはJSONだけを出力する（ログやエラーは標準エラー出力へ）。
- 構造は次のとおり。`schemaVersion` は破壊的な変更をするときに上げる。

```ts
interface Report {
  schemaVersion: 1;
  tool: { name: "didit"; version: string };
  generatedAt: string;
  lang: "en" | "ja";
  range: {
    mode: "worktree" | "staged" | "commit";
    base: { ref: string; sha: string };
    current: { ref: string; sha: string; dirty: boolean };
  };
  summary: {
    filesChanged: number;
    filesSkipped: number;             // バイナリやサイズ超過で対象外にした数
    high: number; medium: number; low: number;   // 解除済みは含まない
    suppressed: number;
    failOn: "high" | "medium" | "low" | "none";
    failed: boolean;
  };
  findings: Finding[];                // 解除済みも含む（suppressed で区別）
  suppressionsAdded: { file: string; line: number; ruleId?: string; reason: string }[];
  runs?: { base?: RunResult; current: RunResult };
}
```
JSON Schema を `schema/report.schema.json` として同梱し、テストで出力が適合することを確認します。

### 9.3 Markdown（`--format markdown`）
内容はテキスト出力と同じです。PRコメントに貼れるよう、表と `<details>` を使います。色やANSIエスケープは使いません。

### 9.4 引き継ぎ資料（`--handoff`）
`<out-dir>/handoff.md` と `<out-dir>/handoff.json` を出力します（JSONは Report に `goal` と `openItems` を加えたもの）。

`handoff.md` の構成：
```markdown
# Handoff — <リポジトリ名> (<base>..<current>)
生成: <日時> / didit <version>

## 目的
<--goal ＞ .didit/goal.md ＞ 範囲内の最新コミットの件名 ＞ 「（未指定）」>

## 変更したファイル
| ファイル | 状態 | +行 | -行 |

## 実際に確認したこと
| 実行 | コミット | 日時 | 結果 |
（--run がなければ「テストは実行していません」と明記する）

## 人が確認すべき指摘
（high / medium の指摘。解除済みは除く）

## 未確認・未解決の事項
- 関連するテストの変更が見つからないソースファイル（※推定）
- 追加された解除とその理由
- テストを実行していない場合はその旨

## 次の担当者（AI）への指示
1. 上の指摘を、修正するか、理由をコメントで説明してください。
2. 作業後に `npx didit --run "<コマンド>"` を実行してください。
3. テストのスキップ・削除や判定条件の緩和で問題を回避しないでください。
```
「関連するテストの変更が見つからない」とは、変更したソースファイル（ts/js/py、テストファイルを除く）と同じ名前（拡張子を除く）を含むテストファイルが、差分の中に1つもない状態です。推定であることを明記します。

---

## 10. 国際化
- 対応言語は `en` と `ja`。
- 言語の決め方：`--lang` ＞ 環境変数 `DIDIT_LANG` ＞ 設定ファイルの `lang` ＞ 環境変数 `LC_ALL` / `LANG` が `ja` で始まれば `ja` ＞ `en`
- メッセージは `src/i18n/en.ts` と `src/i18n/ja.ts` にまとめる。キーの欠落は型チェックで検出できるようにする（`ja` は `en` と同じ型を満たす）。
- `ruleId` やJSONのキーは言語によって変えない。

---

## 11. AIエージェント連携

### 11.1 `didit init`
| コマンド | 内容 |
|---|---|
| `didit init` | `.didit.json` を作り（既にあれば何もしない）、`.gitignore` に `.didit/` を追加する |
| `didit init claude` | `.claude/settings.json` に Stop フックを **追記** する（既存の設定は消さない。同じ設定が既にあれば何もしない） |
| `didit init agents` | `AGENTS.md` に指示文を追記する |
| `didit init cursor` | `.cursor/rules/didit.mdc` を作る |
| `didit init copilot` | `.github/copilot-instructions.md` に指示文を追記する |

- 指示文は `<!-- didit:start -->` と `<!-- didit:end -->` で囲み、何度実行しても重複しないようにする（2回目以降は囲まれた部分だけを置き換える）。
- 指示文の内容（英語。日本語の利用者向けに `--lang ja` で日本語版も用意）：
  > After finishing a task, run `npx didit --run "<test command>"`. Fix every high/medium finding properly. Do not skip, delete, or weaken tests, and do not suppress type or lint errors to make checks pass. If a finding is intentional, add `didit-ok: <reason>` and mention it in your final message.

### 11.2 `didit hook claude`
Claude Code の Stop フックから呼び出されるコマンドです。
```json
{ "hooks": { "Stop": [ { "hooks": [ { "type": "command", "command": "npx didit hook claude" } ] } ] } }
```
1. 標準入力からフックのJSONを読む。
2. `stop_hook_active` が true なら、何もせず終了コード 0（無限ループを防ぐ）。
3. 設定ファイルに従って `check` を実行する（`--run` は設定に `run` がある場合のみ）。
4. `failOn` 以上の指摘があれば、AI向けの簡潔な指摘（最大20件、Markdown）を **標準エラー出力** に書き、**終了コード 2**（Claude に作業の続行と修正を促す）。
5. 指摘がなければ終了コード 0。didit 自体のエラーの場合は、標準エラー出力にエラーを書いて終了コード 1（AIの作業を止めない）。

> [!WARNING]
> フックの入出力の形式は Claude Code の更新で変わる可能性があります。実装時に公式ドキュメントで最新の形式を確認し、確認した日付と内容を DECISIONS.md に記録してください。

---

## 12. 非機能要件
| 項目 | 要件 |
|---|---|
| 速さ | 50ファイル・2,000行の差分を、`--run` なしで **1秒以内** に検査する（M1 マシンの目安。ベンチマーク用のテストを用意する） |
| プライバシー | ネットワーク通信をしない。データをリポジトリの外に保存しない（一時的な worktree を除く） |
| 安全性 | git はシェルを通さずに実行する。一時的な worktree は必ず後片付けする。`--run` は利用者が指定したコマンドだけを実行する |
| 安定性 | 1つのルールが例外を投げても、他のルールの検査は続ける。失敗したルールは標準エラー出力に表示し、終了コード 2 にはしない |
| 互換性 | `ruleId`、終了コード、JSON の `schemaVersion: 1` は、公開後に破壊的な変更をしない |

---

## 13. ディレクトリ構成
```
.
├── AGENTS.md
├── README.md / README.ja.md
├── CONTRIBUTING.md / CODE_OF_CONDUCT.md / SECURITY.md / LICENSE (Apache-2.0)
├── CHANGELOG.md
├── .didit.json                     # didit 自身の設定（fixtures を除外）
├── .github/
│   ├── workflows/ci.yml            # lint・型検査・テスト（ubuntu / macos / windows × Node 20, 22）
│   ├── workflows/codeql.yml
│   ├── dependabot.yml
│   └── ISSUE_TEMPLATE/ (bug.yml, new-rule.yml, false-positive.yml)
├── docs/
│   ├── SPEC.md / RULES.md / TASKS.md / DECISIONS.md
│   └── cheats.md                   # AIのごまかし事例集
├── schema/report.schema.json
├── examples/demo/                  # デモ用リポジトリを作るスクリプトと VHS の tape ファイル
├── src/
│   ├── cli.ts
│   ├── commands/ (check.ts, init.ts, hook.ts, rules.ts)
│   ├── git/ (exec.ts, range.ts, diff.ts, content.ts, worktree.ts)
│   ├── diff/ (parse.ts, classify.ts)
│   ├── rules/
│   │   ├── index.ts                # レジストリ
│   │   ├── types.ts
│   │   ├── lib/ (patterns.ts, count.ts, pairing.ts)
│   │   └── <rule-id>.ts            # 1ルール1ファイル
│   ├── suppress.ts
│   ├── config.ts
│   ├── run/ (runner.ts, kill.ts, parsers/{junit,vitest,jest,pytest}.ts)
│   ├── report/ (text.ts, json.ts, markdown.ts, handoff.ts)
│   └── i18n/ (index.ts, en.ts, ja.ts)
└── test/
    ├── helpers/repo.ts             # 一時的な git リポジトリを作るヘルパー
    ├── rules/<rule-id>.test.ts
    ├── e2e/*.test.ts
    └── fixtures/
```

---

## 14. テストの方針
- **ルールの単体テスト：** 差分（unified diff の文字列）と、必要に応じて base／current の内容を入力にし、期待する指摘を確認する。「検出すべき例」と「検出してはいけない例」をそれぞれ2件以上用意する。
- **E2Eテスト：** `test/helpers/repo.ts` で一時的な git リポジトリを作り、コミットや変更を加えてから CLI を実行する。JSON出力と終了コードを確認する。
- **実行機能のテスト：** `--run` には、Node で書いた小さな偽のテストコマンド（Vitest／Jest／pytest の要約行を出力するだけのもの）を使う。base 側の worktree が後片付けされることも確認する。
- **スナップショット：** テキスト出力は色なしでスナップショットテストする。
- **didit 自身にも didit を使う：** CI で `node dist/cli.js --base origin/main --fail-on high` を実行する。
- カバレッジの目標：行カバレッジ 85% 以上（基準を下げないこと）。

---

## 15. 全体の受け入れ基準（v0.2 完了時）
1. `npm run check`（lint ＋型検査＋テスト）が、3つのOS（ubuntu／macos／windows）すべてで成功する。
2. RULES.md のすべてのルールが実装され、それぞれ「検出すべき例」「検出してはいけない例」が2件以上ずつある。
3. `examples/demo` のスクリプトで作ったリポジトリに対して、`npx didit --run "npm test"` を実行すると、README に載せた出力例と同じ指摘が出る。
4. 50ファイル・2,000行の差分を1秒以内に検査できる。
5. `didit init claude` と `didit hook claude` を使い、指摘がある場合は終了コード 2、`stop_hook_active` が true の場合は終了コード 0 になることをテストで確認している。
6. README、README.ja、CONTRIBUTING、CODE_OF_CONDUCT、SECURITY、LICENSE、Issue テンプレート、CodeQL、Dependabot が揃っている。
7. `npm pack` で作ったパッケージを別のフォルダにインストールし、`npx didit --help` が動く。
