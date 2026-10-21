import { afterEach, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { createRepo, type TestRepo } from '../helpers/repo.js';
import { collectDiffs } from '../../src/git/diff.js';
import { getContent, prepareContents } from '../../src/git/content.js';
import { resolveRange } from '../../src/git/range.js';
import type { FileDiff } from '../../src/rules/types.js';

const repos: TestRepo[] = [];
async function repo(): Promise<TestRepo> {
  const r = await createRepo();
  repos.push(r);
  return r;
}
afterEach(async () => {
  await Promise.all(repos.splice(0).map((r) => r.cleanup()));
});

it('keeps newline, Unicode, tab, quotes and metacharacters exact in staged and commit batches', async () => {
  const r = await repo();
  const names = ['space name.ts', '日本語.ts', '$(echo unsafe).ts'];
  if (process.platform !== 'win32')
    names.push('line\nname.ts', 'tab\tname.ts', 'quote"name.ts');
  for (const name of names) await r.write(name, 'before α\n');
  await r.commit('before');
  for (const name of names) await r.write(name, 'index 日本語\n');
  await r.git(['add', '--all']);
  for (const name of names) await r.write(name, 'worktree β\n');
  const staged = await resolveRange(r.path, { staged: true });
  const files = (await collectDiffs(staged)).files;
  expect(files.map((f) => f.path).sort()).toEqual([...names].sort());
  for (const file of files) {
    expect(await getContent(staged, file, 'base')).toBe('before α\n');
    expect(await getContent(staged, file, 'current')).toBe('index 日本語\n');
  }
  await r.git(['commit', '-m', 'index snapshot']);
  const committed = await resolveRange(r.path, { head: 'HEAD' });
  for (const file of (await collectDiffs(committed)).files)
    expect(await getContent(committed, file, 'current')).toBe('index 日本語\n');
  const working = await resolveRange(r.path);
  for (const file of (await collectDiffs(working)).files)
    expect(await getContent(working, file, 'current')).toBe('worktree β\n');
});

it('respects exact byte-size boundaries before hydrating blobs on either side', async () => {
  const r = await repo();
  await r.write('exact.ts', 'x'.repeat(1024));
  await r.write('old-large.ts', 'x'.repeat(1025));
  await r.write('new-large.ts', 'small');
  await r.commit('before');
  await r.write('exact.ts', 'y'.repeat(1024));
  await r.write('old-large.ts', 'small');
  await r.write('new-large.ts', 'y'.repeat(1025));
  await r.git(['add', '--all']);
  const range = await resolveRange(r.path, { staged: true });
  const result = await collectDiffs(range, { maxFileSizeKb: 1 });
  expect(result.files.map((file) => file.path)).toEqual(['exact.ts']);
  expect(result.filesChanged).toBe(3);
  expect(result.filesSkipped).toBe(2);
  const file = result.files[0];
  if (!file) throw new Error('Missing exact-boundary file');
  expect(await getContent(range, file, 'base')).toHaveLength(1024);
  expect(await getContent(range, file, 'current')).toHaveLength(1024);
});

it('uses a constant number of Git processes and no per-file show calls, including rule content reads', async () => {
  const r = await repo();
  for (let i = 0; i < 50; i++)
    await r.write(`f${String(i)}.ts`, `before ${String(i)}\n`);
  await r.commit('before');
  for (let i = 0; i < 50; i++)
    await r.write(`f${String(i)}.ts`, `after ${String(i)}\n`);
  const trace = path.join(r.path, '.git', 'trace.json');
  const previous = process.env.GIT_TRACE2_EVENT;
  process.env.GIT_TRACE2_EVENT = trace;
  try {
    const range = await resolveRange(r.path);
    const result = await collectDiffs(range);
    for (const file of result.files) {
      expect(await getContent(range, file, 'base')).toContain('before');
      expect(await getContent(range, file, 'current')).toContain('after');
    }
  } finally {
    if (previous === undefined) delete process.env.GIT_TRACE2_EVENT;
    else process.env.GIT_TRACE2_EVENT = previous;
  }
  const event = z.object({
    event: z.string(),
    argv: z.array(z.string()).optional(),
  });
  const starts = (await readFile(trace, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => {
      const value: unknown = JSON.parse(line);
      return event.parse(value);
    })
    .filter((record) => record.event === 'start');
  expect(starts.length).toBeLessThanOrEqual(14);
  expect(starts.some((record) => record.argv?.includes('--batch'))).toBe(true);
  expect(starts.filter((record) => record.argv?.includes('show'))).toHaveLength(
    0,
  );
  console.info(
    `Batch process count: ${String(starts.length)} Git starts for 50 files, including cached rule reads`,
  );
});

it('bounds aggregate hydration while retaining correct fallback reads for cache overflow', async () => {
  const r = await repo();
  const files: FileDiff[] = [];
  for (let i = 0; i < 34; i++) {
    const name = `large-${String(i)}.ts`;
    await r.write(
      name,
      String(i).padStart(2, '0') + 'x'.repeat(1024 * 1024 - 2),
    );
    files.push({
      path: name,
      status: 'deleted',
      hunks: [],
      isBinary: false,
      isTestFile: false,
      language: 'ts',
    });
  }
  await r.commit('large objects');
  const range = await resolveRange(r.path);
  const trace = path.join(r.path, '.git', 'cache-trace.json');
  const previous = process.env.GIT_TRACE2_EVENT;
  process.env.GIT_TRACE2_EVENT = trace;
  try {
    await prepareContents(range, files, 1024 * 1024);
    for (const [index, file] of files.entries()) {
      expect(await getContent(range, file, 'base')).toBe(
        String(index).padStart(2, '0') + 'x'.repeat(1024 * 1024 - 2),
      );
    }
  } finally {
    if (previous === undefined) delete process.env.GIT_TRACE2_EVENT;
    else process.env.GIT_TRACE2_EVENT = previous;
  }
  const events = (await readFile(trace, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => {
      const value: unknown = JSON.parse(line);
      return z
        .object({ event: z.string(), argv: z.array(z.string()).optional() })
        .parse(value);
    })
    .filter((event) => event.event === 'start');
  expect(
    events.filter((event) => event.argv?.includes('--batch')),
  ).toHaveLength(3);
  expect(events.filter((event) => event.argv?.includes('show'))).toHaveLength(
    3,
  );
});

it('skips gitlinks without requesting missing submodule commit contents', async () => {
  const r = await repo();
  await r.write('a', 'base');
  await r.commit('base');
  await r.git([
    'update-index',
    '--add',
    '--cacheinfo',
    `160000,${'1'.repeat(40)},module`,
  ]);
  const result = await collectDiffs(
    await resolveRange(r.path, { staged: true }),
  );
  expect(result.filesChanged).toBe(1);
  expect(result.filesSkipped).toBe(1);
  expect(result.files).toEqual([]);
});

it('does not inspect excluded unmerged index paths', async () => {
  const r = await repo();
  await r.write('conflict.ts', 'base\n');
  await r.write('safe.ts', 'base\n');
  await r.commit('base');
  await r.git(['checkout', '-b', 'branch']);
  await r.write('conflict.ts', 'branch\n');
  await r.commit('branch');
  await r.git(['checkout', 'main']);
  await r.write('conflict.ts', 'main\n');
  await r.commit('main');
  await expect(r.git(['merge', 'branch'])).rejects.toThrow();
  await r.write('safe.ts', 'changed\n');
  await r.git(['add', 'safe.ts']);
  const result = await collectDiffs(
    await resolveRange(r.path, { staged: true }),
    { exclude: ['conflict.ts'] },
  );
  expect(result.files.map((file) => file.path)).toEqual(['safe.ts']);
});
