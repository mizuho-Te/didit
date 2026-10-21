# didit 検出ルール仕様（RULES）

- 共通の約束事は [SPEC.md 7章](./SPEC.md#7-ルールエンジン) を参照してください。
- **差分で新しく追加された行（または減ったもの）だけを指摘します。** 以前からあるものは指摘しません。
- 「追加行」とは、差分の `add` 行です。未追跡ファイルや新規ファイルでは、すべての行が追加行になります。
- 正規表現は目安です。「検出すべき例」と「検出してはいけない例」の両方を満たすように調整してください。調整した内容は DECISIONS.md に記録します。
- `TS/JS` は拡張子が `.ts .tsx .mts .cts .js .jsx .mjs .cjs` のファイル、`Py` は `.py` のファイルです。

## 一覧

| # | ruleId | 既定の重要度 | 分類 | 対象 | 版 |
|---|---|---|---|---|---|
| 1 | `test-skip-added` | high | test-disabled | TS/JS のテスト | v0.1 |
| 2 | `test-only-added` | high | test-disabled | TS/JS のテスト | v0.1 |
| 3 | `py-test-skip-added` | high | test-disabled | Py のテスト | v0.2 |
| 4 | `test-file-deleted` | high | test-removed | テストファイル | v0.1 |
| 5 | `test-case-removed` | high | test-removed | テストファイル | v0.1 |
| 6 | `assertion-count-decreased` | high | test-removed | テストファイル | v0.1 |
| 7 | `assertion-weakened` | high | assertion-weakened | テストファイル | v0.1 |
| 8 | `expected-value-changed` | medium | expected-changed | テストファイル | v0.1 |
| 9 | `snapshot-updated` | low | expected-changed | `*.snap` | v0.1 |
| 10 | `ts-suppress-added` | medium | suppression | TS/JS | v0.1 |
| 11 | `any-added` | low | suppression | TS | v0.1 |
| 12 | `lint-disable-added` | medium | suppression | TS/JS | v0.1 |
| 13 | `py-suppress-added` | medium | suppression | Py | v0.2 |
| 14 | `tsconfig-loosened` | medium | config-weakened | `tsconfig*.json` | v0.2 |
| 15 | `test-script-weakened` | high | config-weakened | `package.json`、Python の設定 | v0.2 |
| 16 | `coverage-threshold-lowered` | medium | config-weakened | 設定ファイル | v0.2 |
| 17 | `ci-weakened` | high | ci-weakened | `.github/workflows/*.y?ml` | v0.2 |
| 18 | `empty-catch-added` | medium | error-swallowed | TS/JS、Py | v0.1（Py は v0.2） |
| 19 | `test-env-branch-added` | high | test-env-branch | テスト以外の TS/JS、Py | v0.2 |
| 20 | `didit-config-changed` | medium | didit-config | `.didit.json` | v0.2 |
| R1 | `run-tests-failing` | high | run | `--run` の結果 | v0.2 |
| R2 | `run-test-count-decreased` | high | run | `--run` の結果 | v0.2 |
| R3 | `run-skipped-increased` | high | run | `--run` の結果 | v0.2 |

---

## 1. `test-skip-added`
- **検出：** TS/JS のテストファイルの追加行が、次のいずれかに一致する。
  - `\b(it|test|describe|suite|context)\.(skip|todo)\b`
  - `\b(it|test|describe)\.skipIf\s*\(`
  - `\b(xit|xtest|xdescribe)\s*\(`
- **メッセージ：** en: `Test was skipped` ／ ja: `テストがスキップされました`

| 検出すべき例（追加行） | 検出してはいけない例 |
|---|---|
| `it.skip("discount cap", () => {` | `it("skip button works", () => {`（タイトルに skip を含むだけ） |
| `xdescribe("cart", () => {` | 以前から存在した `it.skip(...)`（ctx 行） |
| `test.todo("refund")` | テストファイル以外での `foo.skip()` |

## 2. `test-only-added`
- **検出：** TS/JS のテストファイルの追加行が `\b(it|test|describe|suite|context)\.only\b` または `\b(fit|fdescribe)\s*\(` に一致する。
- **理由：** `.only` を付けると、他のテストが実行されなくなります。
- **メッセージ：** en: `.only restricts which tests run` ／ ja: `.only により他のテストが実行されなくなります`

| 検出すべき例 | 検出してはいけない例 |
|---|---|
| `it.only("works", () => {` | `const only = true;` |
| `fdescribe("api", () => {` | `describe("only admins", () => {` |

## 3. `py-test-skip-added`
- **検出：** Py のテストファイルの追加行が、次のいずれかに一致する。
  - `@pytest\.mark\.(skip|skipif|xfail)\b`
  - `\bpytest\.skip\s*\(`
  - `@unittest\.(skip|skipIf|skipUnless|expectedFailure)\b`
  - `\bself\.skipTest\s*\(`
- **メッセージ：** en: `Test was skipped or marked as expected failure` ／ ja: `テストがスキップ、または失敗を許容する設定になりました`

| 検出すべき例 | 検出してはいけない例 |
|---|---|
| `@pytest.mark.skip(reason="flaky")` | `def test_skip_button():` |
| `@pytest.mark.xfail` | `# @pytest.mark.skip`（コメント行。`#` で始まる行は対象外） |

## 4. `test-file-deleted`
- **検出：** 状態が `deleted` のテストファイル（名前の変更は除く）。
- **解除：** 設定ファイルの `ignore` でだけ解除できる。
- **メッセージ：** en: `Test file was deleted` ／ ja: `テストファイルが削除されました`

## 5. `test-case-removed`
- **検出：** テストファイルについて、base 側と current 側の内容でテストの数を数え、current の方が少ない。
  - TS/JS：`\b(it|test)(\.(each|concurrent|failing|sequential)\b[^(]*\([^)]*\))?\s*\(\s*['"\x60]` に一致する数（`.skip` や `.todo` は数えない）
  - Py：`^\s*(async\s+)?def\s+test_\w*\s*\(` に一致する数
- **報告：** `side: "file"`。メッセージに件数を含める（例：`12 → 10`）。
- **メッセージ：** en: `Number of tests decreased ({before} → {after})` ／ ja: `テストの数が減りました（{before} → {after}）`

| 検出すべき例 | 検出してはいけない例 |
|---|---|
| `it("a")` と `it("b")` があったファイルから `it("b")` を削除 | タイトルの変更だけ（数は同じ） |
| `def test_x` を削除 | `it("a")` を `it.each([...])("a %s")` に書き換え（数は同じ） |

> 注：テストを別のファイルへ移動した場合も、移動元のファイルでは数が減るため検出します（移動先は人が確認します）。

## 6. `assertion-count-decreased`
- **検出：** テストファイルについて、base と current でアサーションの数を数え、current の方が少ない。**同じファイルで `test-case-removed` が出た場合は報告しない**（重複を避ける）。
  - TS/JS：`\bexpect\s*\(`、`\bassert(\.\w+)?\s*\(`
  - Py：`^\s*assert\b`、`\bself\.assert\w+\s*\(`、`\bpytest\.raises\s*\(`
- **メッセージ：** en: `Number of assertions decreased ({before} → {after})` ／ ja: `アサーションの数が減りました（{before} → {after}）`

## 7. `assertion-weakened`
- **検出：** テストファイルの同じハンク内で、**強い判定** を含む削除行と、**弱い判定** を含む追加行が対になっている。
- **対の作り方：** 同じハンク内で、削除行と追加行が変更行の並びで3行以内の距離にあるもの（`src/rules/lib/pairing.ts` に共通処理として実装する）。

| | 強い判定（削除行） | 弱い判定（追加行） |
|---|---|---|
| TS/JS | `.toBe(`、`.toEqual(`、`.toStrictEqual(`、`.toMatchObject(`、`.toHaveBeenCalledWith(`、`.toHaveLength(`、引数がある `.toThrow(…)` | `.toBeDefined()`、`.toBeTruthy()`、`.not.toBeNull()`、`.not.toBeUndefined()`、`expect.anything()`、引数がない `.toHaveBeenCalled()`、引数がない `.toThrow()` |
| Py | `assert <式> == <式>`、`assertEqual(`、`assertIn(`、`assertRaises(<例外>` | `assert <式>`（比較演算子なし）、`assert True`、`assertTrue(`、`assertIsNotNone(` |

- **メッセージ：** en: `Assertion was weakened` ／ ja: `判定条件が緩くなりました`

| 検出すべき例 | 検出してはいけない例 |
|---|---|
| `- expect(total).toBe(900)` `+ expect(total).toBeDefined()` | `- expect(a).toBe(1)` `+ expect(a).toBe(2)`（→ ルール8の対象） |
| `- assert res.status == 200` `+ assert res` | 弱い判定から強い判定への変更 |

## 8. `expected-value-changed`
- **検出：** テストファイルの同じハンク内で対になった削除行と追加行について、判定関数の **引数だけ** が違う。両方の行で判定関数の引数部分を `<ARG>` に置き換えると、同じ文字列になる。
  - 対象の判定関数：`toBe`、`toEqual`、`toStrictEqual`、`toHaveLength`、`toContain`、`toMatch`、`toBeCloseTo`、`toHaveBeenCalledWith`、Py の `assert X == <ARG>`、`assertEqual(X, <ARG>)`
- **意図：** バグに合わせて期待値を書き換えた可能性を確認してもらう。仕様変更なら正当。
- **メッセージ：** en: `Expected value changed — confirm the spec changed, not the test adapted to a bug` ／ ja: `期待値が変更されました。不具合に合わせてテストを書き換えていないか確認してください`

## 9. `snapshot-updated`
- **検出：** `**/__snapshots__/**` または `*.snap` のファイルが変更・追加・削除された。ファイルごとに1件報告し、変更行数をメッセージに含める。
- **メッセージ：** en: `Snapshot changed ({lines} lines) — confirm it was intended` ／ ja: `スナップショットが変更されました（{lines}行）。意図した変更か確認してください`

## 10. `ts-suppress-added`
- **検出：** TS/JS の追加行に次のいずれかがある。
  - `@ts-ignore`、`@ts-nocheck` → 既定の重要度（medium）
  - `@ts-expect-error` で、後ろに説明がない（`@ts-expect-error\s*$`、または直後が `*/` だけ） → medium
  - `@ts-expect-error` で、後ろに3文字以上の説明がある → **low**
- **メッセージ：** en: `Type error suppression added` ／ ja: `型エラーの抑制が追加されました`

## 11. `any-added`
- **検出：** `.ts .tsx .mts .cts` の追加行に `:\s*any\b`、`\bas\s+any\b`、`<any>`、`\bany\[\]` がある。文字列リテラルやコメントの中かどうかは区別しなくてよい（low のため）。
- **メッセージ：** en: `'any' type added` ／ ja: `any 型が追加されました`

## 12. `lint-disable-added`
- **検出：** TS/JS の追加行に `eslint-disable`（`-next-line`／`-line` を含む）、`biome-ignore`、`oxlint-disable` がある。
- **メッセージ：** en: `Lint rule disabled` ／ ja: `Lint のルールが無効化されました`

## 13. `py-suppress-added`
- **検出：** Py の追加行に `#\s*type:\s*ignore`、`#\s*pyright:\s*ignore`、`#\s*pylint:\s*disable` がある → medium。`#\s*noqa` → **low**。
- **メッセージ：** en: `Type/lint suppression added` ／ ja: `型・Lint のエラー抑制が追加されました`

## 14. `tsconfig-loosened`
- **検出：** `tsconfig*.json` の base と current を `jsonc-parser` で読み、`compilerOptions` を比べる。
  - `strict`、`noImplicitAny`、`strictNullChecks`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitReturns`：true だったものが false になった、または削除された → medium
  - `skipLibCheck`：false（または未設定）から true になった → low
  - `checkJs`：true から false になった → medium
- **メッセージ：** en: `TypeScript check loosened: {option}` ／ ja: `TypeScript の検査が緩くなりました：{option}`

## 15. `test-script-weakened`
- **検出（package.json）：** base と current の `scripts` を比べ、キーが `test` または `test:` で始まるスクリプトについて、次のいずれかに当てはまる。
  - スクリプトが削除された
  - 新しく `--passWithNoTests`、`|| true`、`|| exit 0`、`; exit 0` が含まれるようになった
  - 内容が `echo` や `exit 0` だけになった
  - 新しく `--testPathIgnorePatterns`、`--exclude`、`--bail=0` が加わった
- **検出（Python の設定）：** `pyproject.toml`、`pytest.ini`、`setup.cfg`、`tox.ini` の追加行に、`--deselect`、`--ignore=`、`-p no:`、`addopts` 内の `-k ` がある。
- **メッセージ：** en: `Test command was weakened` ／ ja: `テストの実行方法が弱められました`

## 16. `coverage-threshold-lowered`
- **検出：** 設定ファイル（`vitest.config.*`、`jest.config.*`、`package.json`、`pyproject.toml`、`.coveragerc`、`setup.cfg`、`codecov.yml`）で、同じハンク内の削除行と追加行が対になっており、同じキーの数値が下がった。
  - 対象のキー：`lines`、`branches`、`functions`、`statements`、`fail_under`、`--cov-fail-under`、`target`
  - 数値の取り出し：`(\w[\w-]*)\s*[:=]\s*['"]?(\d+(\.\d+)?)%?`
- **メッセージ：** en: `Coverage threshold lowered ({key}: {before} → {after})` ／ ja: `カバレッジの基準が下がりました（{key}: {before} → {after}）`

## 17. `ci-weakened`
- **検出：** `.github/workflows/*.yml` / `*.yaml` で、次のいずれかに当てはまる。
  - 追加行に `continue-on-error:\s*true`
  - 追加行に `if:\s*(false|\$\{\{\s*false\s*\}\})`
  - `run:` を含む追加行に `|| true` が新しく含まれる
  - 削除行が `run:` を含み、その内容に `test|lint|tsc|typecheck|type-check|pytest|mypy|pyright|vitest|jest|eslint` が含まれ、同じハンクに同等の追加行がない
  - ワークフローのファイルそのものが削除された
- **メッセージ：** en: `CI check was weakened or removed` ／ ja: `CI の検査が弱められた、または削除されました`

## 18. `empty-catch-added`
- **検出（TS/JS）：**
  - 追加行が `catch\s*(\([^)]*\))?\s*\{\s*\}` に一致する
  - 追加行が `catch\s*(\([^)]*\))?\s*\{\s*$` に一致し、次の追加行が `^\s*\}` だけ
  - 追加行に `\.catch\(\s*\(\s*\w*\s*\)\s*=>\s*(\{\s*\}|undefined|null)\s*\)`
- **検出（Py）：**
  - 追加行が `^\s*except\b.*:\s*pass\s*$` に一致する
  - 追加行が `^\s*except\b.*:\s*$` に一致し、次の追加行が `^\s*pass\s*$` だけ
- コメントだけを含むブロック（例：`catch { /* ignore */ }`）も検出する。
- **メッセージ：** en: `Error is silently swallowed` ／ ja: `エラーが握りつぶされています`

## 19. `test-env-branch-added`
- **検出：** **テストファイル以外** の TS/JS、Py の追加行が、テスト中かどうかで処理を分けている。
  - TS/JS：`process\.env\.(NODE_ENV\s*===?\s*['"]test['"]|VITEST|JEST_WORKER_ID)`、`import\.meta\.env\.(MODE\s*===?\s*['"]test['"]|VITEST)`
  - Py：`PYTEST_CURRENT_TEST`、`['"]pytest['"]\s+in\s+sys\.modules`
- **除外：** 設定ファイル（`*.config.*`、`vitest.setup.*`、`jest.setup.*`、`conftest.py`）
- **理由：** テストのときだけ正しく動く「特別扱い」は、典型的なごまかしです。
- **メッセージ：** en: `Production code behaves differently under tests` ／ ja: `テスト実行時だけ動作が変わるコードが追加されました`

## 20. `didit-config-changed`
- **検出：** `.didit.json` が追加・変更・削除された。特に `rules` に `"off"` が追加された場合、`failOn` が緩くなった場合、`ignore` が追加された場合は、その内容をメッセージに含める。
- **解除：** できない（この変更自体を人が確認するため）。
- **メッセージ：** en: `didit configuration changed: {detail}` ／ ja: `didit の設定が変更されました：{detail}`

---

## run ルール（`--run` を使ったときだけ）

### R1. `run-tests-failing`
- **検出：** current 側の実行で、終了コードが 0 以外、または時間切れになった。
- **メッセージ：** en: `Tests are failing (exit {code})` ／ ja: `テストが失敗しています（終了コード {code}）`

### R2. `run-test-count-decreased`
- **検出：** base と current の両方で件数を取得でき、`current.total < base.total`。
- **メッセージ：** en: `Fewer tests ran ({before} → {after})` ／ ja: `実行されたテストの数が減りました（{before} → {after}）`

### R3. `run-skipped-increased`
- **検出：** base と current の両方で件数を取得でき、`current.skipped > base.skipped`。
- **メッセージ：** en: `More tests were skipped ({before} → {after})` ／ ja: `スキップされたテストが増えました（{before} → {after}）`

### 要約行の読み取り例（パーサーのテストに使う）
```text
# Vitest
 Test Files  3 passed (3)
      Tests  45 passed | 3 skipped (48)

# Vitest（失敗あり）
      Tests  2 failed | 43 passed | 3 skipped (48)

# Jest
Tests:       3 skipped, 45 passed, 48 total

# Jest（失敗あり）
Tests:       2 failed, 3 skipped, 43 passed, 48 total

# pytest
========== 45 passed, 3 skipped in 1.23s ==========
========== 2 failed, 43 passed, 3 skipped, 1 xfailed in 2.01s ==========
```
- pytest の `xfailed` は skipped として数え、`xpassed` は passed として数えます。
- ANSI エスケープを取り除いてから読み取ります。
- 要約行が複数ある場合は、最後の行を使います。

---

## 新しいルールを追加するとき（CONTRIBUTING.md にも転記する）
1. `src/rules/<rule-id>.ts` を作り、`src/rules/index.ts` に登録する。
2. `test/rules/<rule-id>.test.ts` に「検出すべき例」と「検出してはいけない例」を2件以上ずつ書く。
3. `src/i18n/en.ts` と `ja.ts` にメッセージを追加する。
4. このファイル（RULES.md）に項目を追加する。
5. 実際にあった事例なら、`docs/cheats.md` にも追加する。
