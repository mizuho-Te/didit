export const ruleMessages = {
  'py-test-skip-added': 'Test was skipped or marked as expected failure',
  'py-suppress-added': 'Type/lint suppression added',
  'tsconfig-loosened': 'TypeScript check loosened: {option}',
  'test-script-weakened': 'Test command was weakened',
  'coverage-threshold-lowered':
    'Coverage threshold lowered ({key}: {before} → {after})',
  'ci-weakened': 'CI check was weakened or removed',
  'test-env-branch-added': 'Production code behaves differently under tests',
  'didit-config-changed': 'didit configuration changed: {detail}',

  'test-skip-added': 'Test was skipped',
  'test-only-added': '.only restricts which tests run',
  'test-file-deleted': 'Test file was deleted',
  'test-case-removed': 'Number of tests decreased ({before} → {after})',
  'assertion-count-decreased':
    'Number of assertions decreased ({before} → {after})',
  'assertion-weakened': 'Assertion was weakened',
  'expected-value-changed':
    'Expected value changed — confirm the spec changed, not the test adapted to a bug',
  'snapshot-updated':
    'Snapshot changed ({lines} lines) — confirm it was intended',
  'ts-suppress-added': 'Type error suppression added',
  'any-added': "'any' type added",
  'lint-disable-added': 'Lint rule disabled',
  'empty-catch-added': 'Error is silently swallowed',
} as const;
export const ruleDescriptions = ruleMessages;

export const uiEn = {
  invalidHookInput: 'Hook input must be JSON text',
  largeHookInput: 'Hook input exceeds the 1 MiB limit',
  help: `didit — review weakened verification in Git changes
Usage: didit [check] [options]
       didit rules
       didit init [claude|agents|cursor|copilot]
       didit hook claude
       didit --version | --help
Options:
  --base <ref> --head <ref> --staged
  --run <command> --no-base-run --junit <glob> --timeout <sec>
  --format <text|json|markdown> --fail-on <high|medium|low|none>
  --handoff --goal <text> --out-dir <dir>
  --lang <en|ja> --config <path> --quiet --no-color
Exit codes: 0 no threshold findings; 1 findings; 2 usage/runtime error.
Claude hook: 0 continue stopping; 2 request fixes; 1 nonblocking tool error.`,
  error: 'Error',
  invalidOption: 'Invalid or unsupported option',
  missingValue: 'An option value is required',
  incompatible: '--staged and --head cannot be combined',
  noChanges: 'No changes to check.',
  baseHint: 'To compare another base, use --base main.',
  summary: 'Result',
  suppressed: 'suppressed',
  changes: 'changed files',
  skipped: 'files skipped',
  hint: 'Review every finding. If intentional, explain it with // didit-ok: reason.',
  ruleFailure: 'A rule failed; remaining rules were checked',
  addedSuppressions: 'Suppressions added in this change',
  tests: 'Test execution',
  notRun: 'Tests were not run.',
  passed: 'passed',
  failed: 'failed',
  testSkipped: 'skipped',
};

export const ruleConfigDetails = {
  parseFailure: 'Details could not be parsed',
  added: 'added',
  modified: 'modified',
  deleted: 'deleted',
  renamed: 'renamed',
};
