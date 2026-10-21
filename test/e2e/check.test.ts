import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Ajv } from 'ajv';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli-app.js';
import { createRepo, type TestRepo } from '../helpers/repo.js';

const repos: TestRepo[] = [];
afterEach(async () => {
  await Promise.all(repos.splice(0).map((repo) => repo.cleanup()));
});
async function fixture(): Promise<TestRepo> {
  const repo = await createRepo();
  repos.push(repo);
  await repo.write(
    'cart.test.ts',
    'it("discount", () => { expect(1).toBe(1); });\n',
  );
  await repo.commit('test: add synthetic test');
  return repo;
}
async function validateReport(text: string): Promise<Record<string, unknown>> {
  const schema: unknown = JSON.parse(
    await readFile(
      new URL('../../schema/report.schema.json', import.meta.url),
      'utf8',
    ),
  );
  const ajv = new Ajv();
  if (schema === null || typeof schema !== 'object')
    throw new Error('Expected a schema object');
  const validate = ajv.compile(schema);
  const report: unknown = JSON.parse(text);
  expect(validate(report), JSON.stringify(validate.errors)).toBe(true);
  if (report === null || typeof report !== 'object' || Array.isArray(report))
    throw new Error('Expected a report object');
  return Object.fromEntries(Object.entries(report));
}
describe('inspection end to end', () => {
  it('finds newly skipped tests and emits only valid report JSON', async () => {
    const repo = await fixture();
    await repo.write(
      'cart.test.ts',
      'it.skip("discount", () => { expect(1).toBe(1); });\n',
    );
    const result = await runCli(['--format', 'json'], '0.1.0', repo.path);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    const report = await validateReport(result.stdout);
    expect(report['findings']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'test-skip-added',
          file: 'cart.test.ts',
          line: 1,
          side: 'added',
        }),
      ]),
    );
  });
  it('checks staged content rather than later working tree content', async () => {
    const repo = await fixture();
    await repo.write(
      'cart.test.ts',
      'it.skip("discount", () => { expect(1).toBe(1); });\n',
    );
    await repo.git(['add', 'cart.test.ts']);
    await repo.write(
      'cart.test.ts',
      'it("discount", () => { expect(1).toBe(1); });\n',
    );
    const result = await runCli(
      ['--staged', '--format', 'json'],
      '0.1.0',
      repo.path,
    );
    expect(result.exitCode).toBe(1);
    await validateReport(result.stdout);
  });
  it('compares an explicit head commit to its parent', async () => {
    const repo = await fixture();
    await repo.write(
      'cart.test.ts',
      'it.only("discount", () => { expect(1).toBe(1); });\n',
    );
    const head = await repo.commit('test: introduce synthetic focus');
    const result = await runCli(
      ['--head', head, '--format', 'json'],
      '0.1.0',
      repo.path,
    );
    expect(result.exitCode).toBe(1);
    await validateReport(result.stdout);
  });
  it('honors an explicit base and fail-on none', async () => {
    const repo = await fixture();
    const base = await repo.git(['rev-parse', 'HEAD']);
    await repo.write(
      'cart.test.ts',
      'it.only("discount", () => { expect(1).toBe(1); });\n',
    );
    const head = await repo.commit('test: introduce synthetic focus');
    const result = await runCli(
      ['--base', base, '--head', head, '--fail-on', 'none', '--format', 'json'],
      '0.1.0',
      repo.path,
    );
    expect(result.exitCode).toBe(0);
    expect((await validateReport(result.stdout))['findings']).not.toEqual([]);
  });
  it('reports a clean tree honestly in text and Japanese', async () => {
    const repo = await fixture();
    const result = await runCli([], '0.1.0', repo.path);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No changes to check.');
    expect(result.stdout).toContain('Tests were not run.');
    expect(result.stdout).toContain('--base main');
    expect(
      (await runCli(['--lang', 'ja'], '0.1.0', repo.path)).stdout,
    ).toContain('検査する変更はありません');
  });
  it('uses exit code 2 outside a Git repository', async () => {
    const result = await runCli(['--format', 'json'], '0.1.0', tmpdir());
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toBe('');
  });
  it('handles an empty repository with untracked files', async () => {
    const repo = await createRepo();
    repos.push(repo);
    await repo.write('new.test.ts', 'test.skip("synthetic", () => {});\n');
    const result = await runCli(['--format', 'json'], '0.1.0', repo.path);
    expect(result.exitCode).toBe(1);
    await validateReport(result.stdout);
  });
  it('returns a single quiet summary line and no colors', async () => {
    const repo = await fixture();
    await repo.write('cart.test.ts', 'test.only("synthetic", () => {});\n');
    const result = await runCli(['--quiet', '--no-color'], '0.1.0', repo.path);
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    expect(result.stdout).not.toContain('\u001b');
  });
});
