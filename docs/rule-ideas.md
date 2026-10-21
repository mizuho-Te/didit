# Five draft good-first issues

These proposals are not implemented features or created GitHub issues. Each block is ready to copy into an issue after maintainer review. TODO: add the verified repository URL before publishing. Use independent rule files, bilingual messages, and at least two positive and two negative tests. Do not broaden supported languages silently.

## 1. Detect newly added Go test skips

**Title:** Detect newly added Go test skips

**Suggested rule ID:** `go-test-skip-added`

**Labels:** `good first issue`, `enhancement`

### Background

Go test suites can become green by adding t.Skip or t.Skipf. Extend classification deliberately; Go support is not currently implemented.

### Must detect

1. In cart_test.go, add t.Skip("missing fixture") inside TestCart.
2. In cart_test.go, add t.Skipf("device %s unavailable", name) inside TestDevice.

### Must not detect

1. Leave an existing t.Skip unchanged in context.
2. Add a comment or string mentioning t.Skip without calling it.

### Acceptance criteria

- Document classification, severity, limitations, and suppression behavior before implementation.
- Register the rule and configuration ID; add English/Japanese messages.
- Add the four tests above and relevant unchanged-context coverage.
- Update RULES and the synthetic example catalog; pass the full unchanged check suite.

## 2. Detect newly added Rust ignored tests

**Title:** Detect newly added Rust ignored tests

**Suggested rule ID:** `rust-test-ignore-added`

**Labels:** `good first issue`, `enhancement`

### Background

An #[ignore] attribute can remove a Rust test from the default run. This is a proposed extension, not existing Rust support.

### Must detect

1. Add #[ignore] immediately before a #[test] function.
2. Add #[ignore = "flaky"] to an existing #[test] function.

### Must not detect

1. Keep an existing ignored test unchanged.
2. Mention #[ignore] inside a comment or string only.

### Acceptance criteria

- Document classification, severity, limitations, and suppression behavior before implementation.
- Register the rule and configuration ID; add English/Japanese messages.
- Add the four tests above and relevant unchanged-context coverage.
- Update RULES and the synthetic example catalog; pass the full unchanged check suite.

## 3. Detect removed error logging in catch blocks

**Title:** Detect removed error logging in catch blocks

**Suggested rule ID:** `error-log-removed`

**Labels:** `good first issue`, `enhancement`

### Background

Removing the last error log may reduce observability without leaving a syntactically empty catch. Keep this proposal limited to TS/JS catch blocks and start with medium severity.

### Must detect

1. Remove console.error(error) from a catch that then returns a fallback, with no replacement reporting.
2. Remove console.error("save failed", error) from a catch that then returns null, with no replacement reporting.

### Must not detect

1. Replace console.error(error) with logger.error(error) in the same catch.
2. Remove a diagnostic console.error outside a catch block.

### Acceptance criteria

- Document classification, severity, limitations, and suppression behavior before implementation.
- Register the rule and configuration ID; add English/Japanese messages.
- Add the four tests above and relevant unchanged-context coverage.
- Update RULES and the synthetic example catalog; pass the full unchanged check suite.

## 4. Detect newly added JUnit Disabled annotations

**Title:** Detect newly added JUnit Disabled annotations

**Suggested rule ID:** `java-test-disabled-added`

**Labels:** `good first issue`, `enhancement`

### Background

JUnit 5 @Disabled excludes a test or class. Java test classification and annotation handling need scoped additions; this is not current Java support.

### Must detect

1. Add @Disabled("flaky") to a JUnit @Test method in CartTest.java.
2. Add @org.junit.jupiter.api.Disabled to a test class in ApiTest.java.

### Must not detect

1. Leave an existing @Disabled unchanged.
2. Add a comment containing @Disabled with no annotation.

### Acceptance criteria

- Document classification, severity, limitations, and suppression behavior before implementation.
- Register the rule and configuration ID; add English/Japanese messages.
- Add the four tests above and relevant unchanged-context coverage.
- Update RULES and the synthetic example catalog; pass the full unchanged check suite.

## 5. Detect removed Python production assertions

**Title:** Detect removed Python production assertions

**Suggested rule ID:** `py-production-assert-removed`

**Labels:** `good first issue`, `enhancement`

### Background

Current assertion-count checks concern test files. A separate rule could flag removal of a production invariant, without treating every assertion as a security boundary.

### Must detect

1. Remove assert amount >= 0 from src/cart.py with no replacement validation.
2. Remove assert user is not None from src/session.py while retaining the subsequent user access.

### Must not detect

1. Replace assert amount >= 0 with an explicit if amount < 0: raise ValueError guard.
2. Move the same assert within the same function without removing the invariant.

### Acceptance criteria

- Document classification, severity, limitations, and suppression behavior before implementation.
- Register the rule and configuration ID; add English/Japanese messages.
- Add the four tests above and relevant unchanged-context coverage.
- Update RULES and the synthetic example catalog; pass the full unchanged check suite.
