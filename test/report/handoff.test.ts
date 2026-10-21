import {
  mkdtemp,
  readFile,
  rm,
  symlink,
  mkdir,
  writeFile,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { check } from '../../src/commands/check.js';
import { parseOptions } from '../../src/options.js';
import { resolveGoal } from '../../src/report/handoff.js';
import { escapeMarkdown, renderMarkdown } from '../../src/report/markdown.js';
import { createRepo, type TestRepo } from '../helpers/repo.js';

const repos: TestRepo[] = [];
afterEach(async () => {
  await Promise.all(repos.splice(0).map((repo) => repo.cleanup()));
});
async function fixture() {
  const repo = await createRepo();
  repos.push(repo);
  await repo.write('cart.ts', 'export const total = 1;\n');
  await repo.commit('feat: synthetic cart');
  return repo;
}
describe('Markdown and handoff', () => {
  it('writes both handoff formats and labels missing tests as heuristic', async () => {
    const repo = await fixture();
    await repo.write('cart.ts', 'export const total = 2;\n');
    const report = await check(
      parseOptions(['--handoff', '--goal', 'Synthetic goal']).options,
      repo.path,
    );
    const markdown = await readFile(`${repo.path}/.didit/handoff.md`, 'utf8');
    expect(markdown).toContain('Synthetic goal');
    expect(markdown).toContain(
      'No related changed test was found (heuristic): cart.ts',
    );
    expect(markdown).toContain('Tests were not run.');
    expect(markdown).toContain('| cart.ts | modified | 1 | 1 |');
    const json: unknown = JSON.parse(
      await readFile(`${repo.path}/.didit/handoff.json`, 'utf8'),
    );
    expect(json).toMatchObject({
      schemaVersion: 1,
      goal: 'Synthetic goal',
      openItems: [
        'No related changed test was found (heuristic): cart.ts',
        'Tests were not run.',
      ],
    });
    expect(renderMarkdown(report)).toContain(
      '| Severity | Location | Finding |',
    );
    expect(renderMarkdown(report)).not.toContain('\u001b');
  });
  it('uses explicit goal then goal file then latest commit in range', async () => {
    const repo = await fixture();
    const base = await repo.git(['rev-parse', 'HEAD']);
    await repo.write('cart.ts', 'export const total = 2;\n');
    const head = await repo.commit('feat: update synthetic cart');
    const report = await check(
      parseOptions(['--base', base, '--head', head]).options,
      repo.path,
    );
    expect(await resolveGoal(repo.path, report)).toBe(
      'feat: update synthetic cart',
    );
    await repo.write('.didit/goal.md', 'Goal from file\n');
    expect(await resolveGoal(repo.path, report)).toBe('Goal from file');
    expect(await resolveGoal(repo.path, report, 'Explicit goal')).toBe(
      'Explicit goal',
    );
  });
  it('does not imply tests are absent when a related test changed', async () => {
    const repo = await fixture();
    await repo.write('cart.ts', 'export const total = 2;\n');
    await repo.write('cart.test.ts', 'it("synthetic", () => {});\n');
    await check(
      parseOptions(['--handoff', '--out-dir', 'reports']).options,
      repo.path,
    );
    expect(
      await readFile(`${repo.path}/reports/handoff.md`, 'utf8'),
    ).not.toContain('No related changed test');
  });
  it('escapes content that could break report tables or inject HTML', () => {
    expect(escapeMarkdown('<script>|`\n&')).toBe(
      '&lt;script&gt;\\|&#96;<br>&amp;',
    );
  });
  it('rejects a symlink output directory rather than writing outside it', async () => {
    const repo = await fixture();
    const outside = await mkdtemp(path.join(tmpdir(), 'didit-handoff-'));
    try {
      await symlink(
        outside,
        `${repo.path}/reports`,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      await expect(
        check(
          parseOptions(['--handoff', '--out-dir', 'reports']).options,
          repo.path,
        ),
      ).rejects.toThrow('symbolic link');
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
  it('rejects a symlink output ancestor before creating outside directories', async () => {
    const repo = await fixture();
    const outside = await mkdtemp(path.join(tmpdir(), 'didit-handoff-'));
    try {
      await symlink(
        outside,
        `${repo.path}/reports`,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      await expect(
        check(
          parseOptions(['--handoff', '--out-dir', 'reports/new/nested'])
            .options,
          repo.path,
        ),
      ).rejects.toThrow('symbolic link');
      expect(await readdir(outside)).toEqual([]);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
  it('rejects a symlink goal ancestor instead of copying outside content', async () => {
    const repo = await fixture();
    const outside = await mkdtemp(path.join(tmpdir(), 'didit-goal-'));
    try {
      await writeFile(path.join(outside, 'goal.md'), 'Private outside content');
      await symlink(
        outside,
        `${repo.path}/.didit`,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      const report = await check(parseOptions([]).options, repo.path);
      await expect(resolveGoal(repo.path, report)).rejects.toThrow(
        'symbolic link',
      );
      await expect(
        check(
          parseOptions(['--handoff', '--out-dir', 'reports']).options,
          repo.path,
        ),
      ).rejects.toThrow('symbolic link');
      await expect(
        readFile(`${repo.path}/reports/handoff.json`),
      ).rejects.toThrow();
      expect(await readFile(path.join(outside, 'goal.md'), 'utf8')).toBe(
        'Private outside content',
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
  it('rejects a symlink goal file and still honors an explicit goal', async () => {
    const repo = await fixture();
    const outside = await mkdtemp(path.join(tmpdir(), 'didit-goal-'));
    try {
      await mkdir(`${repo.path}/.didit`);
      const source = path.join(outside, 'goal.md');
      await writeFile(source, 'Private outside content');
      await symlink(source, `${repo.path}/.didit/goal.md`, 'file');
      const report = await check(parseOptions([]).options, repo.path);
      await expect(resolveGoal(repo.path, report)).rejects.toThrow(
        'symbolic link',
      );
      expect(await resolveGoal(repo.path, report, 'Explicit safe goal')).toBe(
        'Explicit safe goal',
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
