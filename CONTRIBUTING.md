# Contributing

This is a local preview. No published package or final repository URL is assumed. Read [AGENTS.md](AGENTS.md), [SPEC](docs/SPEC.md), [RULES](docs/RULES.md), and [decisions](docs/DECISIONS.md) before changing behavior. The owner's later MIT choice supersedes historical Apache references.

## Development

Use Node.js 20+ and Git 2.30+, preferably the latest supported patch of a CI Node line.

```sh
npm ci
npm run build
npm run check
node dist/cli.js --help
node dist/cli.js --base HEAD --fail-on medium
```

`check` includes lint, formatting, strict typechecking, and Vitest with an unchanged 85% line-coverage threshold. `npm run format` formats the repository; restrict formatting to your own files during concurrent work. Do not skip/delete tests, weaken assertions, lower thresholds, hide errors, or special-case test execution to make checks green. Fixtures containing suspicious code are synthetic detector inputs, not production recommendations.

## Add a rule

1. Create `src/rules/<rule-id>.ts` and register it in `src/rules/index.ts`. Use one independent file per rule and stable kebab-case IDs.
2. Add `test/rules/<rule-id>.test.ts` with at least two positive and two negative examples. Include unchanged context, comments, legitimate edits, and boundary cases as appropriate.
3. Add English and Japanese messages in `src/i18n/en.ts` and `src/i18n/ja.ts` (or the relevant typed message module). Do not inline display strings.
4. Document the rule in `docs/RULES.md`. Update known configuration rule IDs in `src/config.ts`, metadata, and classification when needed.
5. Add a clearly labeled example to `docs/cheats.md`. For a real incident, obtain permission, anonymize it, and distinguish it from synthetic examples.
6. Run build and the complete check command; add schema/E2E tests for changed public behavior. Run didit on your own diff and explain each finding rather than hiding it.

[Five starter proposals](docs/rule-ideas.md) are draft issues, not promises of implemented language support. Discuss scope before adding a dependency or language. Keep Git calls shell-free and retain cleanup/error tests for temporary snapshots. Never claim a test ran if it did not.

## Changes and review

Use Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, or `chore:` followed by a short English description. Keep changes focused. Describe motivation, actual verification commands/results, unverified environments, possible false positives, and design decisions. Do not publish to npm or push remotely without the owner's explicit authorization. Package ownership, private reporting contacts, and hosted checks are release gates.

Use the bug, new-rule, or false-positive issue templates after a repository is available. TODO: insert a verified repository/issues URL before release; do not guess one. For security-sensitive reports, follow [SECURITY.md](SECURITY.md), not a public issue. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Package smoke test

```sh
npm run build
npm pack
```

In a separate scratch project, install the resulting absolute tarball path, then run `npx --no-install didit --help` and inspect a disposable Git repository. Record the package listing, Node/Git versions, and actual results. A local smoke test is not proof of registry publication or all-platform compatibility.
