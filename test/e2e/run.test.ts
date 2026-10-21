import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli-app.js';
import { createRepo, type TestRepo } from '../helpers/repo.js';
const repos: TestRepo[] = [];
afterEach(async () => {
  await Promise.all(repos.splice(0).map((repo) => repo.cleanup()));
});
async function fixture() {
  const repo = await createRepo();
  repos.push(repo);
  await repo.write('synthetic.cjs', 'console.log("Tests 4 passed (4)");\n');
  await repo.commit('test: synthetic test command');
  return repo;
}
describe('CLI test execution', () => {
  it('compares actual before/after executions and returns all three run findings', async () => {
    const repo = await fixture();
    await repo.write(
      'synthetic.cjs',
      'console.log("Tests 2 passed | 1 skipped (3)"); process.exitCode=1;\n',
    );
    const result = await runCli(
      ['--run', 'node synthetic.cjs', '--format', 'json', '--handoff'],
      '0.1.0',
      repo.path,
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    const json: unknown = JSON.parse(result.stdout);
    expect(json).toMatchObject({
      runs: {
        base: { exitCode: 0, counts: { passed: 4, total: 4 } },
        current: { exitCode: 1, counts: { passed: 2, skipped: 1, total: 3 } },
      },
    });
    expect(json).toHaveProperty(
      'findings',
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'run-tests-failing' }),
        expect.objectContaining({ ruleId: 'run-test-count-decreased' }),
        expect.objectContaining({ ruleId: 'run-skipped-increased' }),
      ]),
    );
    expect(
      (await repo.git(['worktree', 'list', '--porcelain']))
        .split('\n')
        .filter((line) => line.startsWith('worktree ')),
    ).toHaveLength(1);
    expect(await readFile(`${repo.path}/.didit/handoff.md`, 'utf8')).toContain(
      '| base: node synthetic.cjs |',
    );
  });
  it('respects configuration run and disabled base run', async () => {
    const repo = await fixture();
    await repo.write(
      '.didit.json',
      JSON.stringify({
        run: 'node synthetic.cjs',
        baseRun: { enabled: false },
      }),
    );
    const result = await runCli(['--format', 'json'], '0.1.0', repo.path);
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    const json: unknown = JSON.parse(result.stdout);
    expect(json).toHaveProperty('runs.current.counts.total', 4);
    expect(json).not.toHaveProperty('runs.base');
  });
  it('prefers JUnit counts over misleading console counts', async () => {
    const repo = await fixture();
    await repo.write(
      'synthetic.cjs',
      'require("node:fs").writeFileSync("junit.xml",`<testsuite tests="2" failures="0" errors="0" skipped="1"/>`); console.log("Tests 99 passed (99)");\n',
    );
    const result = await runCli(
      [
        '--run',
        'node synthetic.cjs',
        '--no-base-run',
        '--junit',
        '*.xml',
        '--format',
        'json',
      ],
      '0.1.0',
      repo.path,
    );
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    const json: unknown = JSON.parse(result.stdout);
    expect(json).toHaveProperty('runs.current.parser', 'junit');
    expect(json).toHaveProperty('runs.current.counts', {
      passed: 1,
      failed: 0,
      skipped: 1,
      total: 2,
    });
  });
  it('emits escaped Markdown execution logs without ANSI', async () => {
    const repo = await fixture();
    await repo.write(
      'synthetic.cjs',
      'console.log("\\u001b[31m<script>unsafe</script>\\u001b[0m");\n',
    );
    const result = await runCli(
      ['--run', 'node synthetic.cjs', '--no-base-run', '--format', 'markdown'],
      '0.1.0',
      repo.path,
    );
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      '<details><summary>Execution logs</summary>',
    );
    expect(result.stdout).toContain('&lt;script&gt;unsafe&lt;/script&gt;');
    expect(result.stdout).not.toContain('\u001b');
    expect(result.stdout).not.toContain('<script>');
  });
});
