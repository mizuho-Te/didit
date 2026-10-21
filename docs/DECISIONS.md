# Implementation decisions

## D-001 Use ESLint and Prettier

- Date: 2026-10-21
- Related: SPEC 3; TASKS M0
- Decision: Use ESLint with typescript-eslint for linting and Prettier for formatting. Include formatting verification in `npm run check`.
- Reason: These are explicitly permitted by the specification and keep type-aware development constraints separate from deterministic formatting.
- Alternatives: Biome is permitted but not selected; maintaining two lint/format stacks is unnecessary.

## D-002 Make the M0 CLI explicitly incomplete

- Date: 2026-10-21
- Related: TASKS M0; SPEC 4
- Decision: Provide only help and version commands during M0. Reject unsupported invocations rather than emitting an empty or successful inspection. Mark the package private and use a development version until implementation and release review are complete.
- Reason: Repository scaffolding must not imply that Git inspection or detection rules already work. The package name remains provisional and is not a verified npm installation target.
- Alternatives: A fake successful report or advertised installation command would misrepresent the implementation.

## D-003 Prepare hosted checks without claiming hosted verification

- Date: 2026-10-21
- Related: SPEC 13–15; TASKS M0, M2
- Decision: Configure the required three-OS, two-Node CI matrix, JavaScript/TypeScript CodeQL analysis, and weekly npm/GitHub Actions dependency updates. CI runs clean installation, build, and the complete check command. Use checkout v6, setup-node v6, and CodeQL v4 major tags, tracked by Dependabot. Do not add didit self-inspection until the scanner is implemented in M2.
- Reason: CI configuration is useful before a remote exists, but no remote operations or publication are authorized. M0 cannot truthfully run its own inspection. CodeQL uses build mode `none` for JavaScript/TypeScript and narrowly scoped upload permissions.
- Alternatives: Claiming hosted checks passed without running them, or invoking a nonexistent scanner, is not acceptable.
- Sources checked on 2026-10-21: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), and [CodeQL Action](https://github.com/github/codeql-action). Major tags are chosen for maintainability; immutable SHA pinning may be adopted during release hardening.

## D-004 Leave missing private reporting contacts explicit

- Date: 2026-10-21
- Related: TASKS M0; SPEC 13, 15
- Decision: Adopt Contributor Covenant 2.1 with its attribution intact. State explicitly in the conduct and security policies that the maintainer must establish verified private reporting channels before public launch.
- Reason: No maintainer identity, private address, or final repository URL was supplied. Invented contacts or claims that private vulnerability reporting is enabled would be unsafe and misleading.
- Alternatives: Do not use fake email addresses, assumed repository links, or public issues for sensitive reports.
- Source: [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct.html).

## D-005 Keep strict checking with a plain tsup configuration

- Date: 2026-10-21
- Related: SPEC 3; TASKS M0
- Decision: Export a plain TypeScript configuration object rather than importing tsup's optional defineConfig helper. Keep skipLibCheck false and all strict checks enabled.
- Reason: tsup 8.5.1's helper declarations refer to a missing types.cts and optional @swc/core; its executable builder works correctly. tsup 9 requires newer Node versions than the specified Node 20 baseline. No compiler suppression or dependency patch is used.

## D-006 Complete milestones under the user's latest direction

- Date: 2026-10-21
- Related: AGENTS milestone stopping rule; TASKS M0–M5
- Decision: The user explicitly requested completing the entire project after the initial M0-only explanation. Continue sequentially through M5, reporting verified milestone progress rather than stopping after each milestone.
- Reason: The latest direct user instruction overrides the earlier stop-and-report instruction. It does not authorize npm publication, remote Git operations, or external outreach.

## D-007 Make test evolution explicit at the M1 boundary

- Date: 2026-10-21
- Related: TASKS M0–M1; SPEC 4, 7, 14
- Decision: Replace the M0-only expectation that all inspections are unavailable with real repository inspection assertions. Keep version/help/invalid-usage checks and add end-to-end mode, JSON schema, locale, and exit-code checks. No test is skipped to make the scanner pass.
- Reason: M1 intentionally implements the behavior that M0 documented as absent. Test fixtures containing skipped-test and suppression syntax are synthetic detector inputs, not disabled Vitest tests; self-inspection may flag these literal strings and results are retained for review.
- Other decisions: Direct concurrent/sequential/failing declarations count as tests. Pair changed lines one-to-one with the nearest eligible line within three changed lines. Configured severity takes precedence over an item-specific severity, then the default. Root commits use the empty tree as their parent. Changed-file counts omit configured/default exclusions but include binary/oversized skips. Symlinks are inspected as link text, not followed outside the repository.

## D-008 Validate configuration and keep changes auditable

- Date: 2026-10-21
- Related: SPEC 5, 7.3, 10; TASKS M2
- Decision: Accept JSONC comments/trailing commas, reject unknown fields and rule IDs, and include field paths or syntax positions in errors. Resolve explicit relative config paths from the repository root. Never disable or suppress the configuration-change rule. Keep explicitly configured severities. Recognize suppression comments rather than ordinary quoted/template/triple-quoted strings.
- Reason: Configuration failures must be visible, and explanations should not disappear from the newly-added suppression inventory. The comment recognizer is conservative, not a full language parser.
- Additional rule details: Recognize quoted JSON coverage keys and --cov-fail-under. Malformed optional details never prevent the mandatory configuration-change finding. CI replacement commands are compared after trimming; a changed command remains review-worthy.

## D-009 Upgrade vulnerable development tooling without reducing checks

- Date: 2026-10-21
- Related: SPEC 3, 14; TASKS M0, M2
- Decision: Upgrade Vitest and its V8 coverage provider together to 4.1.12. Pin the transitive esbuild override to 0.28.2 while retaining Node-20-compatible tsup 8.5.1. Re-run build, strict checks, and all tests against the changed toolchain. Keep the 85% line threshold unchanged.
- Reason: npm audit identified critical/moderate issues in the earlier development-only Vitest chain and a low Windows development-server issue in esbuild. Patched versions eliminate those findings. tsup 9 requires a newer Node baseline; its older supported API is validated against the patched esbuild. Latest Node 20/22 are used for development CI; the built CLI targets Node 20.
- Source: [esbuild advisory](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr); [upstream changelog](https://github.com/evanw/esbuild/blob/main/CHANGELOG.md). The package audit result is evidence for the installed lockfile, not a guarantee against undiscovered issues.

## D-010 Keep configuration metadata visible when content is skipped

- Date: 2026-10-21
- Related: SPEC 7.3; RULES 20
- Decision: Root .didit.json changes, including renaming it away, cannot be hidden by exclusions. Oversized/binary content remains skipped and counts in filesSkipped, but its file metadata remains in files/filesChanged for the mandatory finding. contentOmitted marks this case and content readers return null, avoiding an oversized read or patch.
- Reason: The mandatory anti-bypass finding takes precedence over ordinary file-exclusion convenience. Skipped counts refer to omitted content, not necessarily absence of metadata findings.

## D-011 Adopt MIT for first-party code

- Date: 2026-10-21
- Related: SPEC 13; TASKS M0, M5
- Decision: The owner explicitly selected MIT for didit before public preview preparation, superseding the original Apache-2.0 specification entry. Update the first-party license and package metadata to MIT. Preserve third-party notices and licenses independently.
- Reason: The latest explicit licensing direction controls first-party release terms. No dependency or attributed third-party document is relicensed by this change.

## D-012 Run exact snapshots and always clean up

- Date: 2026-10-21
- Related: SPEC 8, 12; TASKS M3
- Decision: Use detached worktrees for commits. Export the index into an isolated temporary Git repository for staged runs; initialize an empty temporary repository for an empty-tree base. Do not fabricate a commit. Tests that require a HEAD commit in these two special snapshots may fail; report that failure honestly. Link only contained dependency directories. Disable Git checkout hooks and configured smudge/process filters during snapshot creation, avoiding unintended commands or network access.
- Reason: Testing the ordinary worktree for --staged would mislabel the state actually verified. The temporary snapshots extend the specification's worktree exception only to the equivalent staged/empty states. User-specified run/setup commands may themselves modify files or use the network.
- Failure handling: A failed setup is recorded with the actual setup command, no test counts, and no subsequent base test execution. Timeout/interruption kills process descendants. Cleanup attempts every resource even if one removal fails, then reports errors. No unchanged source checkout is reset or cleaned.

## D-013 Validate JUnit with the maintained validator package

- Date: 2026-10-21
- Related: SPEC 3, 8.2; TASKS M3
- Decision: Add fast-xml-validator 1.4.2 (MIT), from the same upstream maintainers, alongside fast-xml-parser. Validate syntax and parsed unknown data, reject DTD/entity declarations, and prevent reading report globs outside the run root. An explicit missing/malformed JUnit report is a runtime error, never invented zero counts.
- Reason: fast-xml-parser 5.11.2 deprecates its validation APIs in favor of the split validator. Adding this small runtime dependency preserves strict lint and actual malformed-XML detection instead of suppressing warnings.
- Source: https://github.com/NaturalIntelligence/fast-xml-validator

## D-014 Keep handoff evidence separate from inference

- Date: 2026-10-21
- Related: SPEC 9.3–9.4; TASKS M3
- Decision: Generate Markdown plus extended report JSON atomically, label missing related test changes as a heuristic, explicitly state when tests were not run, and preserve real command/commit/time/exit results. Escape untrusted report content and remove ANSI sequences from Markdown. Reject a symlink handoff output directory.
- Reason: A handoff must not turn a pattern match or absent test run into a correctness claim. Source comments and command output must not inject HTML into a rendered report.

## D-015 Match the current Claude Stop hook protocol

- Date: 2026-10-21
- Related: SPEC 11; TASKS M4
- Decision: Read JSON from stdin, stop immediately when stop_hook_active is true, report actionable findings to stderr with exit 2, and use nonblocking exit 1 for tool/input errors. Accept omitted stop_hook_active as false, reject a wrong type, and accept future extra fields. Limit input to 1 MiB and actionable output to 20 findings. Do not trust a payload-provided working directory.
- Source checked: https://code.claude.com/docs/en/hooks (2026-10-21).
- Init behavior: Targeted init commands only update the requested integration; run plain init separately for the default config/gitignore. Preserve unknown settings and surrounding marker content, reject malformed markers/settings, and avoid symlink writes. Repeating each operation must be byte-for-byte idempotent.

- M4 follow-up: Resolve the Git root when init is invoked in a repository subdirectory; outside Git, use the selected directory. Hook warnings without actionable findings return 1, while warnings alongside actionable findings retain exit 2 so a failing rule cannot bypass another rule's findings. File replacements preserve existing permission bits and do not mutate a hardlink target.

## D-016 Ship an honest, local-verifiable preview

- Date: 2026-10-21
- Related: TASKS M5; SPEC 15
- Decision: Version 0.2.0 remains private in npm metadata until a separately authorized npm release. Ship a local tarball, clean source archive, bilingual documentation, and a synthetic demo with real Node assertions and Vitest-style summary text. The included GIF renders actual captured CLI output; the VHS recipe is supplied separately and was not executed. No customer experience or launch post is fabricated.
- Verification: Run supported Node 20 and 22 on available Linux. macOS, Windows, and hosted CI/CodeQL remain explicitly unverified until those environments execute the checks.
- Test isolation: The runner test's controlled Node output fixture uses --no-warnings to avoid host-injected experimental proxy warnings changing its exact last-50-lines assertion. Production output capture is unchanged and still retains stderr.
- Distribution: Include third-party notices and security guidance in the tarball. Publish only a clean tree, not local verification history.

## D-017 Never fetch an unverified package from generated commands

- Date: 2026-10-21
- Related: SPEC 11 sample commands; preview distribution
- Decision: Generated hooks, agent instructions, and handoff advice use npx --no-install didit. Install the trusted local tarball in the target project first.
- Reason: The npm name is not verified or published by this project. The sample npx didit command could download unrelated code. This safety refinement preserves local invocation and idempotency while refusing implicit downloads. Tests require the no-install command in generated settings and instructions. No released legacy command migration is needed for the first preview.

## D-018 Harden preview report boundaries

- Date: 2026-10-21
- Related: SPEC 9; final security review
- Decision: Reject symbolic links in handoff output ancestors and goal-file paths, and strip terminal control sequences from repository-controlled text before adding trusted severity colors.
- Verification: Regression tests cover ancestor links, goal links, explicit-goal bypass without file access, and malicious OSC/ANSI in both colored and uncolored output.
- Boundary: Filesystem validation is defensive, not a transactional sandbox against concurrent adversarial filesystem mutation. Optional commands still execute with user permissions.

## D-019 Keep static Git inspection free of configured helper execution

- Date: 2026-10-21
- Related: SPEC local/static inspection; final security review
- Decision: Disable Git fsmonitor, hooks, and pagers in the invocation wrapper. For working-tree diff/status, enumerate configured clean/process/required filter keys and override them locally without changing repository configuration. Existing external-diff/textconv and checkout smudge protections remain.
- Verification: A synthetic executable marker proves ordinary Git invokes configured fsmonitor/clean helpers while didit's static scan does not. Configured process and external-diff helpers are also covered. GitError retains the caller's original arguments.

## D-020 Preserve LF during Windows checkouts

- Date: 2026-10-21
- Related: SPEC 15.1; hosted Windows CI
- Decision: Add `* text=auto eol=lf` to `.gitattributes`. Preserve the existing Prettier configuration, all tests, coverage thresholds, and CI checks. Binary assets remain automatically detected.
- Evidence: [Windows Node 20 job](https://github.com/mizuho-Te/didit/actions/runs/39676922805/job/119489091890) at c7a4313bcacf25347bf4796786a0797884ee2202 built successfully, then failed Prettier on 146 files before typecheck/tests ran. A Linux-hosted local checkout with `core.autocrlf=true` reproduced exactly 146 formatting failures; adding only the attribute and making a fresh checkout passed Prettier. The runner log does not print its autocrlf setting, so that exact runner setting is inferred, not directly observed.
- Sources: [Prettier end-of-line guidance](https://prettier.io/docs/options#end-of-line) recommends this attribute; [Git attributes](https://git-scm.com/docs/gitattributes) explains checkout normalization. A new hosted Windows run is still required to verify the full suite.
- Publication facts: The GitHub source preview is public and its private vulnerability-reporting route is enabled. npm remains unpublished; these facts do not imply all CI platforms passed.

## D-021 Batch tracked Git object reads without weakening performance checks

- Date: 2026-10-21
- Related: SPEC 15.4; hosted Windows/macOS CI
- Evidence: On public commit 756ab936dd0c54393def9fa7bdb94ef69e001a74, Windows Node 20/22 and macOS Node 22 failed only the unchanged 50-file/2,000-line, under-one-second test. Windows measured 2778.2/1798.4 ms. Git Trace2 profiling on Linux showed 109 Git process starts for that tracked-file CLI workload, including 50 individual size queries and 50 content queries. The separate untracked-file benchmark passed on Windows.
- Decision: Resolve only changed tree/index paths through NUL-delimited metadata, then pass validated hexadecimal object IDs to Git's established `cat-file --batch-check` and `--batch` stdin protocol. Parse blob bytes by declared length, not lines. Do not pass filenames to the line-oriented batch protocol. Reuse bounded content within one resolved range; retain at most 32 MiB of preload/cache data and fall back to ordinary reads when the budget is exhausted.
- Boundaries: Keep per-file size/binary checks, symbolic-link handling, protected configuration reporting, shell-free execution, and configured-helper restrictions. Chunk metadata path arguments for Windows limits. Unsupported gitlinks are omitted rather than interpreted as blobs. Preserve all existing tests and the 1,000 ms bound; add protocol, cache-budget, unusual-name, staged/commit, and process-count regressions.
- Compatibility: The batch protocol is documented in [Git's pre-2.30 manual](https://git-scm.com/docs/git-cat-file/2.28.0); no newer NUL batch-input option is required. Local profiling does not establish a hosted Windows/macOS pass; verify the new published commit's complete CI matrix.
