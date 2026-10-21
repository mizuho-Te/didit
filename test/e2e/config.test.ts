import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/cli-app.js';
import { createRepo, type TestRepo } from '../helpers/repo.js';
const repos: TestRepo[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(repos.splice(0).map((repo) => repo.cleanup()));
});
async function fixture(config = '{}') {
  const repo = await createRepo();
  repos.push(repo);
  await repo.write('.didit.json', config);
  await repo.write('cart.test.ts', 'it("works", () => {});\n');
  await repo.commit('test: establish configuration');
  return repo;
}
async function run(repo: TestRepo, args: string[] = []) {
  return runCli(['--format', 'json', ...args], '0.2.0', repo.path);
}
function parse(text: string): unknown {
  return JSON.parse(text);
}
describe('configuration and suppressions end to end', () => {
  it('suppresses an added skip and still lists its newly added comment', async () => {
    const repo = await fixture();
    await repo.write(
      'cart.test.ts',
      '// didit-ok(test-skip-added): upstream issue\nit.skip("pending", () => {});\nit("works", () => {});\n',
    );
    const result = await run(repo);
    expect(result.exitCode).toBe(0);
    expect(parse(result.stdout)).toMatchObject({
      summary: { high: 0, suppressed: 1, failed: false },
      findings: [
        {
          ruleId: 'test-skip-added',
          suppressed: { source: 'comment', reason: 'upstream issue' },
        },
      ],
      suppressionsAdded: [
        {
          file: 'cart.test.ts',
          line: 1,
          ruleId: 'test-skip-added',
          reason: 'upstream issue',
        },
      ],
    });
  });
  it('leaves a finding active with an explicit missing-reason explanation', async () => {
    const repo = await fixture();
    await repo.write(
      'cart.test.ts',
      '// didit-ok:\nit.skip("pending", () => {});\nit("works", () => {});\n',
    );
    const result = await run(repo);
    expect(result.exitCode).toBe(1);
    expect(parse(result.stdout)).toMatchObject({
      summary: { high: 1, suppressed: 0 },
      findings: [{ message: 'Test was skipped (Suppression has no reason)' }],
      suppressionsAdded: [{ reason: '' }],
    });
  });
  it('applies rule severity, off, and configured fail-on with CLI taking precedence', async () => {
    const repo = await fixture(
      '{"failOn":"low","rules":{"test-skip-added":"low","any-added":"off"}}',
    );
    await repo.write(
      'cart.test.ts',
      'it.skip("pending", () => {});\nit("works", () => {});\nconst value: any = 1;\n',
    );
    const result = await run(repo);
    expect(result.exitCode).toBe(1);
    expect(parse(result.stdout)).toMatchObject({
      summary: { high: 0, medium: 0, low: 1, failOn: 'low' },
      findings: [{ ruleId: 'test-skip-added', severity: 'low' }],
    });
    expect((await run(repo, ['--fail-on', 'high'])).exitCode).toBe(0);
  });
  it('adds custom excludes and test patterns to defaults and respects size limits', async () => {
    const repo = await fixture(
      '{"exclude":["fixtures/**"],"testFilePatterns":["checks/*.ts"],"maxFileSizeKb":1}',
    );
    await repo.write('fixtures/fake.test.ts', 'it.skip("ignored", () => {});');
    await repo.write(
      'node_modules/fake.test.ts',
      'it.skip("ignored", () => {});',
    );
    await repo.write('checks/check.ts', 'it.skip("works", () => {});');
    await repo.write('large.test.ts', '//'.repeat(1024));
    const result = await run(repo);
    expect(parse(result.stdout)).toMatchObject({
      summary: { filesChanged: 2, filesSkipped: 1, high: 1 },
      findings: [{ file: 'checks/check.ts' }],
    });
  });
  it('ignores deleted files only via a reasoned config entry', async () => {
    const repo = await fixture(
      '{"ignore":[{"rule":"test-file-deleted","path":"*.test.ts","reason":"retired"},{"rule":"test-case-removed","path":"*.test.ts","reason":"retired"}]}',
    );
    await repo.git(['rm', 'cart.test.ts']);
    const result = await run(repo);
    expect(result.exitCode).toBe(0);
    expect(parse(result.stdout)).toMatchObject({
      findings: [
        {
          ruleId: 'test-file-deleted',
          suppressed: { reason: 'retired', source: 'config' },
        },
        {
          ruleId: 'test-case-removed',
          suppressed: { reason: 'retired', source: 'config' },
        },
      ],
    });
  });
  it('returns usage errors for invalid configuration or explicit missing files', async () => {
    const repo = await fixture('{"rules":{"not-a-rule":"off"}}');
    const result = await run(repo);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('rules');
    expect((await run(repo, ['--config', 'missing.json'])).exitCode).toBe(2);
  });
  it('uses CLI then DIDIT_LANG then configuration then locale', async () => {
    const repo = await fixture('{"lang":"ja"}');
    vi.stubEnv('DIDIT_LANG', undefined);
    vi.stubEnv('LC_ALL', 'en_US.UTF-8');
    expect(parse((await run(repo)).stdout)).toMatchObject({ lang: 'ja' });
    vi.stubEnv('DIDIT_LANG', 'en');
    expect(parse((await run(repo)).stdout)).toMatchObject({ lang: 'en' });
    expect(parse((await run(repo, ['--lang', 'ja'])).stdout)).toMatchObject({
      lang: 'ja',
    });
  });
  it('checks staged comments rather than later working tree suppressions', async () => {
    const repo = await fixture();
    await repo.write('cart.test.ts', 'it.skip("works", () => {});\n');
    await repo.git(['add', 'cart.test.ts']);
    await repo.write(
      'cart.test.ts',
      '// didit-ok: not staged\nit.skip("works", () => {});\n',
    );
    const result = await run(repo, ['--staged']);
    expect(result.exitCode).toBe(1);
    expect(parse(result.stdout)).toMatchObject({
      summary: { suppressed: 0 },
      suppressionsAdded: [],
    });
  });
});
