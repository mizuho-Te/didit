# v0.2 preview verification

Verification date: 2026-10-21. This is a local preview, not an npm release or a claim that all acceptance environments passed.

## Scope delivered

M0–M5 implementation is present: strict TypeScript CLI; Git ranges/staged/untracked support; 20 static and 3 execution-comparison rules; JSONC configuration and auditable reasoned suppressions; optional base/current test execution; text/JSON/Markdown/handoff reports; agent initialization and Claude Stop hook; bilingual documentation, synthetic demo, issue templates, and unpublished launch drafts.

The first-party license is MIT. Generated commands use `npx --no-install didit` and require the trusted local package; npm ownership is not verified. No npm publication, remote Git operation, outreach, or hosted workflow execution was performed during this local verification.

## Recorded milestone checks

Each milestone ran lint, typecheck, tests, and a self-audit before proceeding. The latest user instruction authorized continuing across milestones.

| Milestone | Tests passed | Tests skipped | Self-audit high / medium / low |
| --------- | -----------: | ------------: | ------------------------------ |
| M0        |           20 |             0 | Not yet implemented            |
| M1        |          164 |             0 | 20 / 17 / 15                   |
| M2        |          282 |             0 | 7 / 3 / 8                      |
| M3        |          328 |             0 | 0 / 0 / 0                      |
| M4        |          371 |             0 | 3 / 0 / 0                      |

Milestone findings were reviewed, not hidden. Most point to deliberately suspicious strings in detector tests. M2 also changed the registry expectation from 12 to 20 rules and introduced the required project configuration. M4's three high findings are synthetic skip/only test inputs. Historical logs are in `verification/`; local checkout paths were replaced with `<repo>`.

## Final checks

All commands below completed successfully unless an expected findings exit is stated. All test suites reported **44 passed files, 378 passed tests, 0 skipped tests**. Coverage: **96.89% lines**, 96.02% statements, 92.45% branches, 96.67% functions. Native environment: Linux x64, Node 24.19.0, Git 2.52.0.

| Command                                                                                        | Environment/result                                               | Evidence                             |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| `npm run build`                                                                                | Exit 0                                                           | `verification/m5-build.txt`          |
| `npm run check`                                                                                | Node 24.19.0, exit 0                                             | `verification/m5-check-node24.txt`   |
| `npm exec --yes --cache /tmp/didit-node-cache --package=node@20 -- npm run check`              | Node 20.20.2, exit 0                                             | `verification/m5-check-node20.txt`   |
| `npm exec --yes --cache /tmp/didit-node-cache --package=node@22 -- npm run check`              | Node 22.23.3, exit 0                                             | `verification/m5-check-node22.txt`   |
| `npm ci --cache /tmp/didit-npm-cache`, then `npm run build`, then `npm run check`              | Fresh source copy without dependencies/build/history, all exit 0 | `verification/m5-clean-*.txt`        |
| `npm pack --cache /tmp/didit-npm-cache --pack-destination /tmp/didit-package --json`           | Exit 0, 10 allowlisted files                                     | `verification/m5-pack.txt`           |
| `npm install --ignore-scripts --cache /tmp/didit-npm-cache /tmp/didit-package/didit-0.2.0.tgz` | Separate empty folder, exit 0                                    | `verification/m5-package-smoke.txt`  |
| `npx --no-install --cache /tmp/didit-npm-cache didit --version`, `--help`, `rules`             | Installed tarball, each exit 0; version 0.2.0, 23 rules          | `verification/m5-package-smoke.txt`  |
| `npx --no-install --cache /tmp/didit-npm-cache didit --run 'npm test' --no-color`              | Tarball installed in synthetic demo, expected exit 1             | `verification/m5-packed-demo.txt`    |
| `npm audit --json --cache /tmp/didit-npm-cache`                                                | Exit 0, zero known advisories across all severities              | `verification/dependency-audit.json` |
| `node dist/cli.js --format json`                                                               | 50 new files / 2,000 lines, 374.2 ms including startup, exit 0   | `verification/m5-performance.txt`    |
| `node dist/cli.js --base 9f99b0ea3a187617db7ece762b9a88cfa22eacef --fail-on medium --no-color` | Expected exit 1: high 0 / medium 2 / low 1                       | `verification/m5-self-check.txt`     |

The final self-audit's medium findings are intentional expectation updates for the secure `--no-install` command and version 0.2.0. The low finding is the demo's literal type-suppression input. One binary GIF is skipped. Its suppression inventory recognizes the explanatory footer in captured plain-text output, not an activated code suppression; zero findings are suppressed. No rule was disabled to force a clean self-audit.

A first package attempt failed because the default npm cache was not writable; the explicit temporary cache succeeded. Initial Node 20/22 aggregate checks overlapped unfinished README formatting and were rerun after formatting settled. Node 22 also exposed host-injected proxy warnings in a controlled-output fixture; D-016 records fixture isolation without weakening the exact assertion. A package-demo attempt with only an added PATH entry did not satisfy npm's local-package lookup and returned registry E404; installing the trusted tarball into the target demo, as documented, succeeded. `--no-install` prevents installation but npm may still request registry metadata if the package is absent.

## Demonstration and packaging

The demo uses real Node assertions in a tiny synthetic harness with a Vitest-style summary; it is not the Vitest framework or a real customer incident. The base has 3 passed / 0 failed / 0 skipped; current has 2 passed / 0 failed / 1 skipped. didit reports 5 high / 1 medium / 0 low and exits 1. The included GIF renders the actual captured output. The VHS script is supplied but VHS recording was not run.

The tarball is installed into a separate temporary folder and exercised with `npx --no-install didit --version`, `--help`, and `rules`. Package allowlisting excludes tests, local history, coverage, dependencies, and unrelated files. It includes compiled CLI/source map, schema, README translations, MIT license, third-party notices, changelog, and security policy.

## Verification limits

- Linux checks do not establish macOS or Windows compatibility. The 3-OS × Node 20/22 CI matrix is configured but unexecuted here; SPEC 15.1 remains pending those results.
- CodeQL, hosted GitHub CI, live Claude/Cursor/Copilot installations, and npm publication were not exercised. Hook protocol and initialization were tested locally with synthetic settings/input.
- Pattern-based detection is heuristic and can have false positives or miss semantic weakening. A clean result does not prove correct behavior or agent intent.
- Optional setup/test commands execute arbitrary repository code with the invoking user's permissions. Worktrees are revision isolation, not a security sandbox. Do not run untrusted code with privileged credentials.
- Filesystem validation rejects symlinks defensively but does not provide a transactional guarantee against concurrent adversarial mutation.
- A monitored private vulnerability-reporting route must be established by the final repository maintainer. No private contact is invented.
- Clean installation reports that ESLint 9 is deprecated upstream. This is development tooling; the recorded dependency audit is separate from a maintenance-support guarantee.
