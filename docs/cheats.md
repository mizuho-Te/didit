# Weakening patterns: synthetic examples

Every example below is deliberately constructed for explanation. None is a claimed incident, user story, prevalence measurement, or proof of malicious intent. Paths indicate the file classification required by the rule. Diff snippets are schematic, not complete runnable programs. Run snippets are synthetic parser/result inputs.

See [RULES.md](RULES.md) for exact scope and [the README](../README.md) for limitations and reasoned suppressions.

## 1. `test-skip-added`

Synthetic example: `tests/cart.test.ts`.

```diff
- it("discount", () => {});
+ it.skip("discount", () => {});
```

A previously active test no longer runs.

## 2. `test-only-added`

Synthetic example: `tests/cart.test.ts`.

```diff
- it("discount", () => {});
+ it.only("discount", () => {});
```

Other tests may stop running.

## 3. `py-test-skip-added`

Synthetic example: `tests/test_cart.py`.

```diff
+ @pytest.mark.skip(reason="flaky")
  def test_discount():
      assert discount() == 10
```

Skipping may be intentional; review the missing coverage.

## 4. `test-file-deleted`

Synthetic example: `tests/legacy.test.ts`.

```diff
- it("legacy response", () => { expect(response()).toBe(200); });
```

The entire test file is deleted, not renamed. A surviving-file comment cannot suppress this.

## 5. `test-case-removed`

Synthetic example: `tests/cart.test.ts`.

```diff
  it("discount", () => {});
- it("refund", () => {});
```

There is one fewer declaration in this file. Moving a test also needs review.

## 6. `assertion-count-decreased`

Synthetic example: `tests/cart.test.ts`.

```diff
  it("cart", () => {
    expect(total).toBe(900);
-   expect(tax).toBe(90);
  });
```

The test count is unchanged but it verifies less.

## 7. `assertion-weakened`

Synthetic example: `tests/cart.test.ts`.

```diff
- expect(total).toBe(900);
+ expect(total).toBeDefined();
```

The weaker assertion accepts many incorrect totals.

## 8. `expected-value-changed`

Synthetic example: `tests/cart.test.ts`.

```diff
- expect(total).toBe(900);
+ expect(total).toBe(999);
```

Confirm the requirement changed rather than adapting a test to a bug.

## 9. `snapshot-updated`

Synthetic example: `tests/__snapshots__/cart.snap`.

```diff
- "total": 900
+ "total": 999
```

Snapshots can change legitimately; inspect the content.

## 10. `ts-suppress-added`

Synthetic example: `src/cart.ts`.

```diff
+ // @ts-expect-error
  const total: number = readTotal();
```

An explanation reduces the default severity of expect-error, but does not make it invisible.

## 11. `any-added`

Synthetic example: `src/cart.ts`.

```diff
- const result: unknown = input;
+ const result: any = input;
```

A low-severity signal that static guarantees may have weakened.

## 12. `lint-disable-added`

Synthetic example: `src/cart.ts`.

```diff
+ // eslint-disable-next-line no-unused-vars
  const unused = compute();
```

Review why a lint check is bypassed.

## 13. `py-suppress-added`

Synthetic example: `src/cart.py`.

```diff
- total: int = read_total()
+ total: int = read_total()  # type: ignore
```

Type/lint suppressions may conceal a real mismatch.

## 14. `tsconfig-loosened`

Synthetic example: `tsconfig.json`.

```diff
- { "compilerOptions": { "strict": true } }
+ { "compilerOptions": { "strict": false } }
```

The configuration is compared structurally.

## 15. `test-script-weakened`

Synthetic example: `package.json`.

```diff
- { "scripts": { "test": "vitest run" } }
+ { "scripts": { "test": "vitest run --passWithNoTests" } }
```

A run can now succeed even if it selects no tests.

## 16. `coverage-threshold-lowered`

Synthetic example: `vitest.config.ts`.

```diff
- lines: 85,
+ lines: 50,
```

A lower threshold changes what passing means.

## 17. `ci-weakened`

Synthetic example: `.github/workflows/ci.yml`.

```diff
  - run: npm test
+   continue-on-error: true
```

A failing test step may no longer fail the job.

## 18. `empty-catch-added`

Synthetic example: `src/cart.ts`.

```diff
+ try { saveCart(); } catch {}
```

Errors are discarded without handling.

## 19. `test-env-branch-added`

Synthetic example: `src/cart.ts`.

```diff
+ if (process.env.NODE_ENV === 'test') return 900;
```

Production code now has a special test-environment path. Configuration/setup files are excluded.

## 20. `didit-config-changed`

Synthetic example: `.didit.json`.

```diff
- { "failOn": "high" }
+ { "failOn": "none" }
```

This finding cannot be disabled or suppressed; people must review changes to the checker itself.

## 21. `run-tests-failing`

Synthetic example: `--run result`.

```text
current: exitCode=1, timedOut=false
```

A nonzero exit or timeout is reported. These are synthetic result values, not a captured run.

## 22. `run-test-count-decreased`

Synthetic example: `--run results`.

```text
base:    Tests  48 passed (48)
current: Tests  45 passed (45)
```

Both summaries must be parsed. A smaller selected suite is a review signal, not proof of a deleted test.

## 23. `run-skipped-increased`

Synthetic example: `--run results`.

```text
base:    Tests  48 passed (48)
current: Tests  45 passed | 3 skipped (48)
```

Total count is unchanged but three more tests are skipped.
