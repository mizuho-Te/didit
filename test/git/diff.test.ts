import { afterEach, describe, expect, it } from 'vitest';
import {
  readFile,
  mkdtemp,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRepo, type TestRepo } from '../helpers/repo.js';
import { collectDiffs, parseNameStatus } from '../../src/git/diff.js';
import { getContent } from '../../src/git/content.js';
import { EMPTY_TREE, resolveRange } from '../../src/git/range.js';
import { git, GitError } from '../../src/git/exec.js';

const repos: TestRepo[] = [];
async function repo(): Promise<TestRepo> {
  const result = await createRepo();
  repos.push(result);
  return result;
}
afterEach(async () => {
  await Promise.all(repos.splice(0).map((item) => item.cleanup()));
});

describe('Git range and diff collection', () => {
  it('does not execute configured fsmonitor or clean filters during static scans', async () => {
    const r = await repo();
    await r.write('a.ts', 'before\n');
    await r.write('.gitattributes', '*.ts filter=probe\n');
    await r.commit('initial');
    const marker = path.join(r.path, '.git', 'execution-marker');
    const script = path.join(r.path, '.git', 'probe.cjs');
    await writeFile(
      script,
      `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed'); process.stdout.write('token\\0');`,
    );
    const command = `"${process.execPath.replaceAll('\\', '/')}" "${script.replaceAll('\\', '/')}"`;
    await r.git(['config', 'core.fsmonitor', command]);
    await r.git(['status', '--porcelain']);
    expect(await readFile(marker, 'utf8')).toBe('executed');
    await rm(marker);
    await r.write('a.ts', 'after\n');
    expect(
      (await collectDiffs(await resolveRange(r.path))).files.some(
        (file) => file.path === 'a.ts',
      ),
    ).toBe(true);
    await expect(readFile(marker)).rejects.toMatchObject({ code: 'ENOENT' });
    await r.git(['config', 'core.fsmonitor', 'false']);
    await r.git(['config', 'filter.probe.clean', command]);
    await r.git(['config', 'filter.probe.required', 'true']);
    await r.git(['diff', '--no-ext-diff', '--no-textconv']);
    expect(await readFile(marker, 'utf8')).toBe('executed');
    await rm(marker);
    await r.git(['config', 'filter.probe.process', command]);
    await r.git(['config', 'diff.external', command]);
    const scan = await collectDiffs(await resolveRange(r.path));
    expect(
      scan.files.find((file) => file.path === 'a.ts')?.hunks[0]?.lines,
    ).toContainEqual({ type: 'add', content: 'after', newLine: 1 });
    await expect(readFile(marker)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('handles an empty repository and untracked additions without ignored files', async () => {
    const r = await repo();
    expect((await resolveRange(r.path)).base.sha).toBe(EMPTY_TREE);
    expect((await collectDiffs(await resolveRange(r.path))).files).toEqual([]);
    await r.write('.gitignore', 'ignored.ts\n');
    await r.write('ignored.ts', 'ignored');
    await r.write('new.test.ts', 'first\nsecond\n');
    const range = await resolveRange(r.path);
    const result = await collectDiffs(range);
    expect(range.current.dirty).toBe(true);
    expect(result.files.map((f) => f.path)).toEqual([
      '.gitignore',
      'new.test.ts',
    ]);
    expect(result.files[1]?.hunks[0]?.lines).toEqual([
      { type: 'add', content: 'first', newLine: 1 },
      { type: 'add', content: 'second', newLine: 2 },
    ]);
    await r.git(['add', 'new.test.ts']);
    expect(
      (
        await collectDiffs(await resolveRange(r.path, { staged: true }))
      ).files.map((f) => f.path),
    ).toEqual(['new.test.ts']);
  });
  it('separates index, working tree, commit, and root commit contents', async () => {
    const r = await repo();
    await r.write('a.ts', 'initial\n');
    const initial = await r.commit('initial');
    const rootRange = await resolveRange(r.path, { head: initial });
    expect(rootRange.base.sha).toBe(EMPTY_TREE);
    expect((await collectDiffs(rootRange)).files[0]?.status).toBe('added');
    await r.write('a.ts', 'staged\n');
    await r.git(['add', 'a.ts']);
    await r.write('a.ts', 'working\n');
    const staged = await resolveRange(r.path, { staged: true });
    const stagedFile = (await collectDiffs(staged)).files[0];
    expect(stagedFile).toBeDefined();
    if (!stagedFile) throw new Error('missing file');
    expect(await getContent(staged, stagedFile, 'current')).toBe('staged\n');
    expect(await getContent(staged, stagedFile, 'base')).toBe('initial\n');
    const working = await resolveRange(r.path);
    expect(await getContent(working, stagedFile, 'current')).toBe('working\n');
    const second = await r.commit('second');
    const commit = await resolveRange(r.path, { head: second });
    expect(commit.base.sha).toBe(initial);
    expect(commit.current.dirty).toBe(false);
    expect(await getContent(commit, stagedFile, 'current')).toBe('working\n');
    expect((await collectDiffs(await resolveRange(r.path))).filesChanged).toBe(
      0,
    );
  });
  it('uses the explicit head for merge-base rather than checked-out HEAD', async () => {
    const r = await repo();
    await r.write('a', 'a');
    const initial = await r.commit('initial');
    await r.git(['checkout', '-b', 'feature']);
    await r.write('a', 'feature');
    const feature = await r.commit('feature');
    await r.git(['checkout', 'main']);
    await r.write('b', 'main');
    const main = await r.commit('main');
    expect(
      (await resolveRange(r.path, { base: 'main', head: feature })).base.sha,
    ).toBe(initial);
    expect((await resolveRange(r.path, { base: 'main' })).base.sha).toBe(main);
  });
  it('handles names containing spaces, Unicode, quotes, newlines and shell characters', async () => {
    const r = await repo();
    const names = ['space name.test.ts', '日本語.ts', '$(echo injected).ts'];
    if (process.platform !== 'win32')
      names.push('quote"name.ts', 'new\nline.ts');
    for (const name of names) await r.write(name, 'before\n');
    await r.commit('initial');
    for (const name of names) await r.write(name, 'after\n');
    const range = await resolveRange(r.path);
    const result = await collectDiffs(range);
    expect(result.files.map((f) => f.path).sort()).toEqual([...names].sort());
    for (const file of result.files) {
      expect(file.hunks[0]?.lines).toEqual([
        { type: 'del', content: 'before', oldLine: 1 },
        { type: 'add', content: 'after', newLine: 1 },
      ]);
      expect(await getContent(range, file, 'base')).toBe('before\n');
    }
  });
  it('preserves renames, including edited renames, and deleted content', async () => {
    const r = await repo();
    await r.write('old.test.ts', 'a\nb\nc\nd\ne\n');
    await r.write('gone.ts', 'gone\n');
    await r.commit('initial');
    await rename(
      path.join(r.path, 'old.test.ts'),
      path.join(r.path, 'new.test.ts'),
    );
    await r.write('new.test.ts', 'a\nb\nc\nd\nchanged\n');
    await rm(path.join(r.path, 'gone.ts'));
    await r.git(['add', '--all']);
    const range = await resolveRange(r.path);
    const result = await collectDiffs(range);
    const renamed = result.files.find((f) => f.status === 'renamed');
    const deleted = result.files.find((f) => f.status === 'deleted');
    expect(renamed?.oldPath).toBe('old.test.ts');
    expect(renamed?.path).toBe('new.test.ts');
    expect(renamed?.hunks).toHaveLength(1);
    if (!renamed || !deleted) throw new Error('missing rename or deletion');
    expect(await getContent(range, renamed, 'base')).toBe('a\nb\nc\nd\ne\n');
    expect(await getContent(range, deleted, 'current')).toBeNull();
  });
  it('counts binary and oversized files but not configured/default exclusions', async () => {
    const r = await repo();
    await r.write('tracked.bin', 'old');
    await r.commit('initial');
    await writeFile(path.join(r.path, 'tracked.bin'), Buffer.from([0, 1, 2]));
    await writeFile(path.join(r.path, 'new.bin'), Buffer.from([1, 0, 2]));
    await r.write('large.ts', 'x'.repeat(1100));
    await r.write('src/a.ts', 'ok\n');
    await r.write('dist/a.js', 'ignored');
    await r.write('fixtures/a.ts', 'ignored');
    const result = await collectDiffs(await resolveRange(r.path), {
      maxFileSizeKb: 1,
      exclude: ['fixtures/**'],
    });
    expect(result.filesChanged).toBe(4);
    expect(result.filesSkipped).toBe(3);
    expect(result.files.map((f) => f.path)).toEqual(['src/a.ts']);
  });
  it('cannot hide root configuration changes with exclusions or content limits', async () => {
    const r = await repo();
    await r.write('.didit.json', '{}\n');
    await r.write('other.ts', 'before\n');
    await r.commit('initial');
    await r.write('.didit.json', '{"exclude":["**"]}\n');
    await r.write('other.ts', 'after\n');
    const range = await resolveRange(r.path);
    const excluded = await collectDiffs(range, { exclude: ['**'] });
    expect(excluded.files.map((file) => file.path)).toEqual(['.didit.json']);
    expect(excluded.files[0]?.hunks.length).toBeGreaterThan(0);
    const limited = await collectDiffs(range, {
      exclude: ['**'],
      maxFileSizeKb: 0.001,
    });
    expect(limited.filesChanged).toBe(1);
    expect(limited.filesSkipped).toBe(1);
    const config = limited.files[0];
    expect(config?.contentOmitted).toBe(true);
    expect(config?.hunks).toEqual([]);
    if (!config) throw new Error('Missing protected config metadata');
    expect(await getContent(range, config, 'base')).toBeNull();
    expect(await getContent(range, config, 'current')).toBeNull();
  });
  it('retains binary and renamed-away configuration metadata', async () => {
    const r = await repo();
    await r.write('.didit.json', '{}\n');
    await r.commit('initial');
    await writeFile(path.join(r.path, '.didit.json'), Buffer.from([0, 1]));
    const binary = await collectDiffs(await resolveRange(r.path), {
      exclude: ['**'],
    });
    expect(binary.files[0]?.contentOmitted).toBe(true);
    expect(binary.filesSkipped).toBe(1);
    await r.write('.didit.json', '{}\n');
    await rename(
      path.join(r.path, '.didit.json'),
      path.join(r.path, 'hidden.json'),
    );
    await r.git(['add', '--all']);
    const renamed = await collectDiffs(await resolveRange(r.path), {
      exclude: ['**'],
    });
    expect(renamed.files[0]?.oldPath).toBe('.didit.json');
    expect(renamed.files[0]?.status).toBe('renamed');
  });
  it('reads symbolic links themselves without reading their target', async () => {
    if (process.platform === 'win32') return;
    const r = await repo();
    await r.write('a', 'initial');
    await r.commit('initial');
    await symlink('/does/not/exist', path.join(r.path, 'link'));
    const result = await collectDiffs(await resolveRange(r.path));
    expect(result.files[0]?.hunks[0]?.lines[0]?.content).toBe(
      '/does/not/exist',
    );
  });
  it('reports invalid modes, revisions, and non-repository errors', async () => {
    const r = await repo();
    await expect(
      resolveRange(r.path, { head: 'HEAD', staged: true }),
    ).rejects.toThrow('cannot be combined');
    await expect(
      resolveRange(r.path, { head: 'missing' }),
    ).rejects.toBeInstanceOf(GitError);
    const directory = await mkdtemp(path.join(tmpdir(), 'didit-outside-'));
    try {
      await expect(resolveRange(directory)).rejects.toBeInstanceOf(GitError);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
    try {
      await git(r.path, ['not-a-command']);
      throw new Error('unexpected success');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(GitError);
      if (error instanceof GitError) {
        expect(error.exitCode).not.toBe(0);
        expect(error.stderr).not.toBe('');
        expect(error.args).toEqual(['not-a-command']);
      }
    }
  });
  it('parses zero-delimited status names independently of quoted diff headers', () => {
    expect(
      parseNameStatus('R100\0old\0new\0D\0gone\0').map((f) => [
        f.status,
        f.path,
        f.oldPath,
      ]),
    ).toEqual([
      ['renamed', 'new', 'old'],
      ['deleted', 'gone', undefined],
    ]);
    expect(() => parseNameStatus('R100\0old\0')).toThrow('Missing renamed');
    expect(() => parseNameStatus('\0path\0')).toThrow('Malformed');
  });
  it('collects 50 files and 2,000 changed lines in under one second', async () => {
    const r = await repo();
    for (let i = 0; i < 50; i++)
      await r.write(
        `src/file-${String(i)}.ts`,
        Array.from(
          { length: 20 },
          (_, j) => `const before${String(j)} = ${String(j)};`,
        ).join('\n') + '\n',
      );
    await r.commit('initial');
    for (let i = 0; i < 50; i++)
      await r.write(
        `src/file-${String(i)}.ts`,
        Array.from(
          { length: 20 },
          (_, j) => `const after${String(j)} = ${String(j + 1)};`,
        ).join('\n') + '\n',
      );
    const start = performance.now();
    const result = await collectDiffs(await resolveRange(r.path));
    const elapsed = performance.now() - start;
    expect(result.files).toHaveLength(50);
    expect(
      result.files
        .flatMap((f) => f.hunks.flatMap((h) => h.lines))
        .filter((l) => l.type !== 'ctx'),
    ).toHaveLength(2000);
    console.info(
      `Git/diff benchmark: ${elapsed.toFixed(1)}ms (${process.platform}, ${process.arch}, Node ${process.version})`,
    );
    expect(elapsed).toBeLessThan(1000);
  });
});
