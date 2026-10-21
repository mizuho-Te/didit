# Changelog

## Unreleased: 0.2.0 preview

No npm publication or public release is claimed. The package remains private pending release review.

### Added

- Git worktree, staged, merge-base, commit, and unborn-repository inspection.
- Twenty diff rules covering TS/JS, Python, configuration, CI, and didit configuration changes.
- JSONC configuration, reasoned suppressions, and a visible inventory of new suppression comments.
- Optional current/base command runs, timeouts, temporary snapshot cleanup, JUnit/Vitest/Jest/pytest counts, and three runtime rules.
- English/Japanese text, JSON Schema version 1, Markdown reports, and evidence-aware handoff files.
- Idempotent agent initialization and a Claude Stop hook with recursion protection.
- Synthetic demo materials, contributor guides, issue templates, pre-commit manifest, and unpublished launch drafts.

### Licensing

- First-party code uses MIT by explicit owner choice. Historical Apache-2.0 references in original planning documents are superseded; third-party terms remain intact.

### Limitations and release gates

- Text/diff heuristics can produce false positives and miss complex syntax. A clean report is not a correctness or security guarantee.
- Command execution is not sandboxed; linked dependency directories are shared. Staged/empty snapshots lack a HEAD commit.
- Verify npm name ownership, the final repository URL, private reporting contacts, independent installation, and actual hosted compatibility checks before release. See [verification records](docs/verification) for evidence rather than inferring results from workflow files.
