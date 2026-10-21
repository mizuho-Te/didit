# didit

**Tests passed. But what changed to make them pass?**

A local CLI that flags weakened verification in Git diffs: skipped tests, weaker assertions, suppressed errors, and relaxed checks. Review signals, not a verdict on an author’s intent.

[日本語](README.ja.md)

![Captured didit output from a synthetic demonstration](examples/demo/demo.gif)

The demo is a deliberately constructed example with a tiny Node test harness emitting Vitest-style summaries, not an incident from a real project. See [the demo files](examples/demo).

## Try the local preview

This is a **[public GitHub preview](https://github.com/mizuho-Te/didit), not an npm release**. The npm name is provisional and ownership has not been verified. Do not fetch `npx didit` from the registry: it may refer to an unrelated package. Node.js 20+ and Git 2.30+ are required.

From a trusted checkout:

```sh
npm ci
npm run build
node dist/cli.js --help
node dist/cli.js
npm pack
```

To use the built package in another Git repository, install the local tarball shown by `npm pack` (replace the example path):

```sh
npm install --save-dev /absolute/path/to/didit-0.2.0.tgz
npx --no-install didit
```

Installation may access the registry for dependencies. The scanner itself does not use the network. `npx didit` is the intended shorthand only once the trusted package is already installed locally, or after a future verified publication. Prefer `npx --no-install didit` during this preview.

### Common commands

Run these inside the repository you want to inspect, after the local installation above:

```sh
npx --no-install didit --staged
npx --no-install didit --base main
npx --no-install didit --base main --head HEAD
npx --no-install didit --format json
npx --no-install didit --format markdown
npx --no-install didit --run "npm test"
npx --no-install didit --run "npm test" --junit "reports/*.xml"
npx --no-install didit --handoff --goal "Fix the discount calculation"
npx --no-install didit rules
```

The default compares HEAD with tracked and untracked, non-ignored worktree changes. `--base` selects a merge base; `--head` alone compares a commit with its parent. `--staged` inspects the index and cannot be combined with `--head`. An unborn repository uses an empty-tree base.

Checks exit **0** below the selected threshold, **1** for an unsuppressed finding at or above it, or **2** for usage/runtime errors. The default threshold is `high`; use `--fail-on medium`, `low`, or `none`. Exit 0 does not certify correctness. JSON uses `schemaVersion: 1`; its schema is [included](schema/report.schema.json). Rule failures are warnings on stderr, so inspect those too.

`--handoff` writes `.didit/handoff.md` and `.didit/handoff.json`. Without `--run` or a configured `run`, it explicitly says tests were not run. Missing related test changes are a filename heuristic, not evidence that tests are absent.

## What it flags

| Category              | Signals                                                              |
| --------------------- | -------------------------------------------------------------------- |
| Disabled tests        | TS/JS skip, todo and only; Python skip and expected failure          |
| Removed verification  | Deleted test files, fewer test declarations or assertions            |
| Weaker assertions     | Equality replaced with existence/truthiness checks                   |
| Changed expectations  | Expected values and snapshots changed                                |
| Suppressions          | TypeScript directives, `any`, lint ignores, Python type/lint ignores |
| Relaxed configuration | TypeScript checks, test commands, coverage thresholds                |
| Weaker CI             | Disabled, ignored or removed checks                                  |
| Swallowed errors      | Empty catches and Python exception/pass blocks                       |
| Test-only behavior    | Production code branching on a test environment                      |
| didit configuration   | Changes to `.didit.json`, including new ignores                      |
| Actual runs           | Nonzero exit/timeout, fewer total tests, more skipped tests          |

There are 20 diff rules and three run rules. Read the [rule reference](docs/RULES.md) and [23 synthetic examples](docs/cheats.md). These are conservative text/diff heuristics, not a full parser or a proof that all weakening will be found. Renames, moved tests, generated files, complex syntax, comments, and parameterized tests can need human interpretation. Binary/oversized files and default exclusions are not fully inspected.

## Agent integration

After installing the trusted local package:

```sh
npx --no-install didit init
npx --no-install didit init claude
npx --no-install didit init agents
npx --no-install didit init cursor
npx --no-install didit init copilot
```

Choose the target(s) you use. Plain `init` creates `.didit.json` if missing and adds `.didit/` to `.gitignore`. Targeted initialization updates `.claude/settings.json`, `AGENTS.md`, `.cursor/rules/didit.mdc`, or `.github/copilot-instructions.md`. It preserves unrelated content; instruction blocks use didit markers and repeated initialization is idempotent. Add `--lang ja` for Japanese instructions.

Generated instructions, handoff advice, and the Claude Stop hook use `npx --no-install didit` (the hook adds `hook claude`). Install the trusted local package in the target repository first: these commands must not download a missing package. Repeated initialization remains idempotent. Review the generated settings before enabling the integration.

The hook reads JSON from stdin. It exits **0** when clear or when `stop_hook_active` is true, **2** with findings on stderr when the configured threshold is met, and **1** for an internal error. Hook exit codes differ from `check`. Configuring `run` also enables that command in the hook. Hook protocol and local behavior are tested; actual agent products may change and must be checked in your own setup.

## Configuration

`.didit.json` accepts JSONC. CLI values override configuration; language uses CLI, `DIDIT_LANG`, configuration, then locale. This example does not enable command execution:

```json
{
  "failOn": "high",
  "lang": "en",
  "exclude": ["**/fixtures/**"],
  "testFilePatterns": ["checks/**/*.ts"],
  "rules": { "any-added": "low" },
  "maxFileSizeKb": 1024,
  "timeoutSec": 600,
  "baseRun": {
    "enabled": true,
    "linkDirs": ["node_modules", ".venv", "venv"],
    "setup": null
  }
}
```

Add `"run": "npm test"` only when you want checks, including hooks, to execute that trusted command. Use `--no-base-run` to skip the baseline run. See [the configuration specification](docs/SPEC.md) for all fields and default exclusions.

## Intentional changes and suppressions

Give a reason on the same or preceding line:

```ts
// didit-ok(test-skip-added): Requires a device unavailable in this test environment
it.skip('physical device handshake', () => {});
```

`// didit-ok: reason`, `/* didit-ok: reason */`, and Python `# didit-ok: reason` are also supported. An empty reason does not suppress a finding. File-level/removal findings require a rule-specific comment in the surviving file; deleted files require a configuration ignore:

```json
{
  "ignore": [
    {
      "rule": "test-file-deleted",
      "path": "tests/legacy/**",
      "reason": "The legacy API was retired; replacement coverage is reviewed separately"
    }
  ]
}
```

New suppression comments remain visible in the report. `.didit.json` changes are always reviewable: `didit-config-changed` cannot be disabled or suppressed.

## pre-commit

[The hook manifest](.pre-commit-hooks.yaml) defines `entry: didit --staged`, `language: node`, and `pass_filenames: false`. The public repository is https://github.com/mizuho-Te/didit; pin a reviewed revision before configuring a remote hook. For this preview, after installing the local package, a local system hook can use its binary:

```yaml
repos:
  - repo: local
    hooks:
      - id: didit
        name: didit
        language: system
        entry: npx --no-install didit --staged
        pass_filenames: false
```

Install/configure the pre-commit framework separately. The remote Node hook installation has not been validated against a published repository.

## FAQ

**Are you calling the author a cheat?** No. Legitimate migrations, skips, changed requirements, and regenerated snapshots can trigger findings. didit identifies changes worth reviewing, without inferring intent or deciding that code is wrong. Human-authored changes are treated the same way.

**Does a clean report mean tests passed?** No. Static checks do not run tests. An unrecognized test summary records the real exit status with `parser: "none"`, not invented counts. Runtime count comparisons require counts on both sides and depend on comparable test environments.

**Is it offline/private?** Static analysis has no LLM, telemetry, account, or network request. Reports stay local; temporary snapshots are created outside the repository and cleaned up. Installation and hosted CI are separate network-using operations. User-supplied `--run` and `baseRun.setup` commands are arbitrary code, may communicate externally, and are not sandboxed. Review repository configuration before running didit.

**Are test snapshots isolated?** Commit runs use temporary worktrees; staged and empty-tree runs use temporary Git repositories without a HEAD commit, so commands requiring HEAD may fail. Default dependency links share mutable directories with your checkout: test commands can change them. `baseRun.setup` replaces dependency linking for baseline setup. Temporary snapshots are not security sandboxes or guarantees of reproducible dependency state.

**What is verified?** Local checks and acceptance evidence belong in [verification records](docs/verification). CI is configured for Linux/macOS/Windows × Node 20/22, but configuration is not proof those jobs passed. Do not assume macOS, Windows, live agent integration, registry ownership, or release readiness until their actual results are recorded. Timing is machine-specific, not a universal one-second guarantee.

## Contribute and release status

See [CONTRIBUTING](CONTRIBUTING.md), [rule ideas](docs/rule-ideas.md), [the changelog](CHANGELOG.md), [Code of Conduct](CODE_OF_CONDUCT.md), and [security policy](SECURITY.md). [Private vulnerability reporting](https://github.com/mizuho-Te/didit/security/advisories/new) is enabled. Launch text is draft material only. Package ownership, the complete hosted CI matrix, and installation on independent systems remain release checks.

## License

First-party code: [MIT](LICENSE), as selected by the owner. [Third-party notices](THIRD_PARTY_NOTICES.md) retain their own terms, including Contributor Covenant attribution. The original design documents still contain historical Apache-2.0 references; [decision D-011](docs/DECISIONS.md#d-011-adopt-mit-for-first-party-code) supersedes them.
