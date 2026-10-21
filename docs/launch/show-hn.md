# Show HN draft

Status: unpublished draft. Verify repository/package ownership, independent installation, compatibility evidence, and private reporting contacts before posting. Do not imply a registry release.

## Title

Show HN: didit, a local CLI for spotting weakened tests and checks in Git diffs

## Personal experience

<!-- TODO: 実体験を書く -->

## Body

A passing test run can hide a changed test suite. didit flags changes such as adding a skip, replacing `toBe(900)` with `toBeDefined()`, suppressing a type error, or relaxing CI.

It runs locally without an LLM or telemetry. There are 20 diff rules for TS/JS, Python, and configuration, plus optional before/after test execution with three runtime rules. It can produce JSON, Markdown, and an evidence-oriented handoff, or feed findings back through a Claude Code Stop hook.

It does not infer intent or prove code wrong. Legitimate changes can trigger findings; reasoned suppressions remain visible, and changes to didit's own configuration are flagged. Detection is heuristic, not a full parser. User-supplied test/setup commands are not sandboxed and may use the network.

The current preview is installed from a locally built tarball, then run with `npx --no-install didit`. Please do not fetch `npx didit` from the registry before the package identity is verified. The README has the full preview instructions and compatibility limitations. First-party code is MIT.

Feedback on false positives and narrowly scoped new patterns would be useful. The GIF is a synthetic demonstration, not evidence of an incident or measured prevalence.

TODO: insert verified repository URL and actual demo attachment. Review this draft again against the release state before posting.
