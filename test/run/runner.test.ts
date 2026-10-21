import { describe, expect, it } from 'vitest';
import { readFile, lstat, mkdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { createRepo } from '../helpers/repo.js';
import { resolveRange, EMPTY_TREE } from '../../src/git/range.js';
import { configSchema, resolveConfig } from '../../src/config.js';
import { parseOptions } from '../../src/options.js';
import {
  executeRuns,
  runCommand,
  MAX_OUTPUT_BYTES,
} from '../../src/run/runner.js';
import { createWorktree, linkDependencies } from '../../src/git/worktree.js';
// Keep fixture output deterministic when the host injects Node preload warnings.
// Production commands still retain all stderr; exact 50-line assertions remain.
const node = (source: string) =>
  `"${process.execPath}" --no-warnings -e "${source.replaceAll('"', '\\"')}"`;
function config(run: string, base = true) {
  return resolveConfig(
    parseOptions(['--run', run, ...(base ? [] : ['--no-base-run'])]).options,
    configSchema.parse({}),
  );
}
describe('isolated command execution', () => {
  it('records success, environment, failure, unknown counts and fifty tail lines', async () => {
    const repo = await createRepo();
    try {
      const result = await runCommand(
        node(
          'console.log(process.env.CI, process.env.FORCE_COLOR);for(let i=0;i<60;i++)console.log(i)',
        ),
        repo.path,
        3,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('1 0');
      expect(result.logTail.split('\n')).toHaveLength(50);
      expect(result.logTail).toMatch(/^10\n/);
      expect(
        (await runCommand(node('process.exit(7)'), repo.path, 3)).exitCode,
      ).toBe(7);
      const runs = await executeRuns(
        await resolveRange(repo.path),
        config(node("console.log('unknown')"), false),
      );
      expect(runs.current.parser).toBe('none');
      expect(runs.current.counts).toBeUndefined();
      expect(runs.base).toBeUndefined();
    } finally {
      await repo.cleanup();
    }
  });
  it('bounds retained output while preserving the last lines', async () => {
    const repo = await createRepo();
    try {
      const result = await runCommand(
        node(
          "process.stdout.write('x'.repeat(6*1024*1024));console.log('\\nEND')",
        ),
        repo.path,
        5,
      );
      expect(Buffer.byteLength(result.output)).toBeLessThanOrEqual(
        MAX_OUTPUT_BYTES,
      );
      expect(result.logTail).toMatch(/END$/);
    } finally {
      await repo.cleanup();
    }
  });
  it('times out the complete process group', async () => {
    const repo = await createRepo();
    try {
      const result = await runCommand(
        node('setInterval(()=>{},1000)'),
        repo.path,
        0.15,
      );
      expect(result.timedOut).toBe(true);
      expect(result.exitCode).not.toBe(0);
      expect(result.durationMs).toBeLessThan(3000);
    } finally {
      await repo.cleanup();
    }
  });
  it('terminates spawned descendants before they can write after timeout', async () => {
    const repo = await createRepo();
    try {
      await repo.write(
        'grandchild.cjs',
        "setTimeout(()=>require('node:fs').writeFileSync('orphan.txt','alive'),600);setInterval(()=>{},1000)",
      );
      await repo.write(
        'parent.cjs',
        "require('node:child_process').spawn(process.execPath,['grandchild.cjs'],{stdio:'ignore'});setInterval(()=>{},1000)",
      );
      const result = await runCommand(
        `"${process.execPath}" parent.cjs`,
        repo.path,
        0.2,
      );
      expect(result.timedOut).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      await expect(
        lstat(path.join(repo.path, 'orphan.txt')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await repo.cleanup();
    }
  });
  it('runs base and specified commits and cleans up all worktrees', async () => {
    const repo = await createRepo();
    try {
      await repo.write('count.cjs', "console.log('Tests 4 passed (4)')");
      await repo.commit('base');
      await repo.write(
        'count.cjs',
        "console.log('Tests 2 passed | 1 skipped (3)')",
      );
      await repo.commit('current');
      await repo.write('count.cjs', "throw new Error('wrong worktree')");
      const before = await repo.git(['worktree', 'list', '--porcelain']);
      const runs = await executeRuns(
        await resolveRange(repo.path, { head: 'HEAD' }),
        config(`"${process.execPath}" count.cjs`),
      );
      expect(runs.current.counts?.total).toBe(3);
      expect(runs.base?.counts?.total).toBe(4);
      expect(await repo.git(['worktree', 'list', '--porcelain'])).toBe(before);
      expect(
        await readFile(path.join(repo.path, 'count.cjs'), 'utf8'),
      ).toContain('wrong worktree');
    } finally {
      await repo.cleanup();
    }
  });
  it('runs the exact staged snapshot instead of unstaged edits and untracked files', async () => {
    const repo = await createRepo();
    try {
      await repo.write('test.cjs', "console.log('Tests 1 passed (1)')");
      await repo.commit('base');
      await repo.write('test.cjs', "console.log('Tests 2 passed (2)')");
      await repo.git(['add', 'test.cjs']);
      await repo.write('test.cjs', "throw new Error('unstaged')");
      await repo.write('untracked', 'unrelated');
      const runs = await executeRuns(
        await resolveRange(repo.path, { staged: true }),
        config(`"${process.execPath}" test.cjs`),
      );
      expect(runs.current.counts?.total).toBe(2);
      expect(runs.base?.counts?.total).toBe(1);
      expect(await repo.git(['diff', '--name-only'])).toBe('test.cjs');
    } finally {
      await repo.cleanup();
    }
  });
  it('records failed setup without executing base tests', async () => {
    const repo = await createRepo();
    try {
      await repo.write('test.cjs', "console.log('Tests 1 passed (1)')");
      await repo.commit('base');
      const options = config(`"${process.execPath}" test.cjs`);
      options.baseRun.setup = node('process.exit(9)');
      const runs = await executeRuns(await resolveRange(repo.path), options);
      expect(runs.base?.exitCode).toBe(9);
      expect(runs.base?.command).toBe(options.baseRun.setup);
      expect(runs.base?.counts).toBeUndefined();
      options.baseRun.setup = node('process.exit(0)');
      expect(
        (await executeRuns(await resolveRange(repo.path), options)).base?.counts
          ?.total,
      ).toBe(1);
    } finally {
      await repo.cleanup();
    }
  });
  it('uses empty isolated base and cleans up on JUnit errors', async () => {
    const repo = await createRepo();
    try {
      await repo.write('test.cjs', "console.log('Tests 1 passed (1)')");
      const runs = await executeRuns(
        await resolveRange(repo.path),
        config(`"${process.execPath}" test.cjs`),
      );
      expect(runs.base?.sha).toBe(EMPTY_TREE);
      expect(runs.base?.exitCode).not.toBe(0);
      await repo.commit('base');
      const before = await repo.git(['worktree', 'list', '--porcelain']);
      const options = config(node('process.exit(0)'));
      options.junit = 'missing.xml';
      await expect(
        executeRuns(await resolveRange(repo.path, { head: 'HEAD' }), options),
      ).rejects.toThrow();
      expect(await repo.git(['worktree', 'list', '--porcelain'])).toBe(before);
    } finally {
      await repo.cleanup();
    }
  });
  it('prioritizes JUnit and records errors as failed tests', async () => {
    const repo = await createRepo();
    try {
      await repo.write(
        'report.xml',
        '<testsuite tests="3" errors="1" skipped="1"/>',
      );
      const options = config(
        node("console.log('Tests 99 passed (99)')"),
        false,
      );
      options.junit = 'report.xml';
      const runs = await executeRuns(await resolveRange(repo.path), options);
      expect(runs.current.parser).toBe('junit');
      expect(runs.current.counts).toEqual({
        total: 3,
        passed: 1,
        failed: 1,
        skipped: 1,
      });
      options.run = undefined;
      await expect(
        executeRuns(await resolveRange(repo.path), options),
      ).rejects.toThrow(/command/);
    } finally {
      await repo.cleanup();
    }
  });
  it('handles an already aborted command and spawn failure without listener leaks', async () => {
    const repo = await createRepo();
    try {
      const controller = new AbortController();
      controller.abort();
      const result = await runCommand(
        node('setInterval(()=>{},1000)'),
        repo.path,
        3,
        controller.signal,
      );
      expect(result.exitCode).not.toBe(0);
      await expect(
        runCommand(node('process.exit(0)'), path.join(repo.path, 'missing'), 3),
      ).rejects.toThrow();
    } finally {
      await repo.cleanup();
    }
  });
  it('does not execute configured checkout filters', async () => {
    const repo = await createRepo();
    try {
      await repo.write('.gitattributes', '*.txt filter=marker');
      await repo.write('file.txt', 'content');
      const sha = await repo.commit('base');
      const marker = path.join(repo.path, 'filter-ran').replaceAll('\\', '/');
      await repo.git([
        'config',
        'filter.marker.smudge',
        node(`require('node:fs').writeFileSync('${marker}','executed')`),
      ]);
      await repo.git(['config', 'filter.marker.required', 'true']);
      for (const staged of [false, true]) {
        const worktree = await createWorktree(repo.path, sha, staged);
        try {
          expect(
            await readFile(path.join(worktree.path, 'file.txt'), 'utf8'),
          ).toBe('content');
        } finally {
          await worktree.cleanup();
        }
      }
      await expect(
        lstat(path.join(repo.path, 'filter-ran')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await repo.cleanup();
    }
  });
  it('links dependency directories but rejects escaping destinations', async () => {
    const repo = await createRepo();
    const outside = await createRepo();
    try {
      await repo.write('file', 'one');
      const sha = await repo.commit('base');
      await mkdir(path.join(repo.path, 'node_modules'));
      const worktree = await createWorktree(repo.path, sha);
      try {
        await linkDependencies(repo.path, worktree.path, [
          'node_modules',
          'missing',
        ]);
        expect(
          (
            await lstat(path.join(worktree.path, 'node_modules'))
          ).isSymbolicLink(),
        ).toBe(true);
        await linkDependencies(repo.path, worktree.path, ['node_modules']);
        await expect(
          linkDependencies(repo.path, worktree.path, ['../escape']),
        ).rejects.toThrow();
        await mkdir(path.join(repo.path, 'nested', 'dependency'), {
          recursive: true,
        });
        await symlink(
          outside.path,
          path.join(worktree.path, 'nested'),
          process.platform === 'win32' ? 'junction' : 'dir',
        );
        await expect(
          linkDependencies(repo.path, worktree.path, ['nested/dependency']),
        ).rejects.toThrow();
        await mkdir(path.join(outside.path, 'dependency'));
        await symlink(
          outside.path,
          path.join(repo.path, 'outside'),
          process.platform === 'win32' ? 'junction' : 'dir',
        );
        await expect(
          linkDependencies(repo.path, worktree.path, ['outside/dependency']),
        ).rejects.toThrow();
      } finally {
        await worktree.cleanup();
      }
      await expect(createWorktree(repo.path, 'not-a-commit')).rejects.toThrow();
    } finally {
      await repo.cleanup();
      await outside.cleanup();
    }
  });
  it('aborts active commands and removes signal listeners', async () => {
    const repo = await createRepo();
    try {
      await repo.write('file', 'one');
      await repo.commit('base');
      const before = process.listenerCount('SIGINT');
      const promise = executeRuns(
        await resolveRange(repo.path, { head: 'HEAD' }),
        config(node('setInterval(()=>{},1000)')),
      );
      const rejection = expect(promise).rejects.toThrow(/interrupted/);
      setTimeout(() => {
        process.emit('SIGINT');
      }, 200);
      await rejection;
      expect(process.listenerCount('SIGINT')).toBe(before);
      expect(
        (await repo.git(['worktree', 'list', '--porcelain'])).match(
          /^worktree /gm,
        ),
      ).toHaveLength(1);
    } finally {
      await repo.cleanup();
    }
  });
});
