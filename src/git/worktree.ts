import { mkdtemp, mkdir, rm, lstat, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { git, GitError } from './exec.js';
import { EMPTY_TREE } from './range.js';
import { runMessages } from '../i18n/run-messages.js';
export interface TemporaryWorktree {
  path: string;
  cleanup: () => Promise<void>;
}
export async function createWorktree(
  root: string,
  sha: string,
  staged = false,
): Promise<TemporaryWorktree> {
  const filterNames = await git(root, [
    'config',
    '--name-only',
    '--get-regexp',
    '^filter\\..*\\.(smudge|process|required)$',
  ]).catch((error: unknown) => {
    if (error instanceof GitError && error.exitCode === 1) return '';
    throw error;
  });
  const safeOptions = [
    '-c',
    'core.hooksPath=',
    ...filterNames
      .split(/\r?\n/)
      .filter(Boolean)
      .flatMap((name) => [
        '-c',
        `${name}=${name.endsWith('.required') ? 'false' : ''}`,
      ]),
  ];
  const container = await mkdtemp(path.join(tmpdir(), 'didit-run-'));
  const target = path.join(container, 'tree');
  let attached = false;
  async function cleanup(): Promise<void> {
    if (attached) {
      await git(root, ['worktree', 'remove', '--force', target]);
      attached = false;
    }
    await rm(container, { recursive: true, force: true });
  }
  try {
    if (staged || sha === EMPTY_TREE) {
      await mkdir(target);
      if (staged)
        await git(root, [
          ...safeOptions,
          'checkout-index',
          '--all',
          `--prefix=${target.replaceAll('\\', '/')}/`,
        ]);
      await git(target, ['init', '--quiet']);
    } else {
      await git(root, [
        ...safeOptions,
        'worktree',
        'add',
        '--detach',
        '--no-checkout',
        target,
        sha,
      ]);
      attached = true;
      await git(target, [
        ...safeOptions,
        'checkout',
        '--force',
        '--detach',
        sha,
      ]);
    }
    return { path: target.replaceAll('\\', '/'), cleanup };
  } catch (error: unknown) {
    await cleanup();
    throw error;
  }
}
export async function linkDependencies(
  root: string,
  target: string,
  directories: string[],
): Promise<void> {
  for (const directory of directories) {
    const relative = path.relative(root, path.resolve(root, directory));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error(runMessages('en').unsafePath);
    const source = path.resolve(root, directory);
    const destination = path.resolve(target, directory);
    const sourceStat = await lstat(source).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return undefined;
      throw error;
    });
    if (!sourceStat?.isDirectory()) continue;
    const sourceWithin = path.relative(
      await realpath(root),
      await realpath(source),
    );
    if (sourceWithin.startsWith('..') || path.isAbsolute(sourceWithin))
      throw new Error(runMessages('en').unsafePath);
    const existing = await lstat(destination).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return undefined;
      throw error;
    });
    if (existing) continue;
    let ancestor = target;
    for (const part of path
      .relative(target, path.dirname(destination))
      .split(path.sep)
      .filter(Boolean)) {
      ancestor = path.join(ancestor, part);
      const stat = await lstat(ancestor).catch((error: unknown) => {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return undefined;
        throw error;
      });
      if (stat?.isSymbolicLink()) throw new Error(runMessages('en').unsafePath);
      if (!stat) await mkdir(ancestor);
    }
    const parent = await realpath(path.dirname(destination));
    const within = path.relative(await realpath(target), parent);
    if (within.startsWith('..') || path.isAbsolute(within))
      throw new Error(runMessages('en').unsafePath);
    await symlink(
      source,
      destination,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  }
}
