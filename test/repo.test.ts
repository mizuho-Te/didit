import { access, readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { createRepo, type TestRepo } from './helpers/repo.js';

const repositories: TestRepo[] = [];
afterEach(async () => {
  await Promise.all(repositories.splice(0).map((repo) => repo.cleanup()));
});
async function repo(): Promise<TestRepo> {
  const created = await createRepo();
  repositories.push(created);
  return created;
}
describe('temporary Git repositories', () => {
  it('initializes an isolated repository with a normalized path', async () => {
    const created = await repo();
    expect(created.path).not.toContain('\\');
    expect(await created.git(['symbolic-ref', '--short', 'HEAD'])).toBe('main');
    expect(await created.git(['status', '--porcelain'])).toBe('');
  });
  it('writes nested files and commits their exact content', async () => {
    const created = await repo();
    await created.write('src/nested/example.ts', 'export const count = 1;\n');
    const sha = await created.commit('feat: add synthetic example');
    expect(sha).toMatch(/^[a-f0-9]{40}$/);
    expect(await created.git(['show', 'HEAD:src/nested/example.ts'])).toBe(
      'export const count = 1;',
    );
    expect(await created.git(['status', '--porcelain'])).toBe('');
  });
  it('handles spaces, Unicode, and shell metacharacters as literal paths', async () => {
    const created = await repo();
    await created.write(
      'space folder/ユニコード; echo literal.txt',
      'synthetic\n',
    );
    await created.commit('test: preserve literal file paths');
    expect(
      await readFile(
        `${created.path}/space folder/ユニコード; echo literal.txt`,
        'utf8',
      ),
    ).toBe('synthetic\n');
  });
  it('normalizes Windows-style relative separators', async () => {
    const created = await repo();
    await created.write('nested\\example.txt', 'example');
    expect(await readFile(`${created.path}/nested/example.txt`, 'utf8')).toBe(
      'example',
    );
  });
  it.each([
    '../escape.txt',
    '/absolute.txt',
    'C:\\escape.txt',
    '.git/config',
    'nested/../../escape.txt',
    '',
  ])('rejects unsafe path %s', async (file) => {
    const created = await repo();
    await expect(created.write(file, 'synthetic')).rejects.toThrow(
      'Test file path',
    );
  });
  it('preserves Git failures instead of reporting success', async () => {
    const created = await repo();
    await expect(created.git(['rev-parse', 'HEAD'])).rejects.toThrow();
  });
  it('removes the repository and supports repeated cleanup', async () => {
    const created = await repo();
    await created.write('example.txt', 'example');
    await created.cleanup();
    await expect(access(created.path)).rejects.toThrow();
    await expect(created.cleanup()).resolves.toBeUndefined();
  });
});
