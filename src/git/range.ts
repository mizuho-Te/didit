import { gitErrors } from '../i18n/git-errors.js';
import type { Report } from '../rules/types.js';
import { git, GitError } from './exec.js';

export const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
export type ResolvedRange = Report['range'] & { root: string };
export interface RangeOptions {
  base?: string;
  head?: string;
  staged?: boolean;
}

async function revision(root: string, ref: string): Promise<string> {
  return (
    await git(root, [
      'rev-parse',
      '--verify',
      '--end-of-options',
      `${ref}^{commit}`,
    ])
  ).trim();
}

export async function resolveRange(
  cwd: string,
  options: RangeOptions = {},
): Promise<ResolvedRange> {
  if (options.staged && options.head)
    throw new Error(gitErrors.conflictingModes);
  const root = (await git(cwd, ['rev-parse', '--show-toplevel']))
    .replace(/\r?\n$/, '')
    .replaceAll('\\', '/');
  let head: string;
  try {
    head = await revision(root, options.head ?? 'HEAD');
  } catch (error: unknown) {
    if (options.head || !(error instanceof GitError)) throw error;
    // Only an unborn branch is an empty repository; other revision failures remain errors.
    const refs = await git(root, ['show-ref', '--head']).catch(
      (failure: unknown) => {
        if (failure instanceof GitError && failure.exitCode === 1) return '';
        throw failure;
      },
    );
    if (refs.trim()) throw error;
    head = EMPTY_TREE;
  }
  let base = head;
  let baseRef = 'HEAD';
  if (options.base) {
    const requested = await revision(root, options.base);
    base = (await git(root, ['merge-base', requested, head])).trim();
    baseRef = options.base;
  } else if (options.head) {
    const parents = (
      await git(root, ['rev-list', '--parents', '-n', '1', head])
    )
      .trim()
      .split(' ');
    base = parents[1] ?? EMPTY_TREE;
    baseRef = base === EMPTY_TREE ? 'empty-tree' : `${options.head}~1`;
  } else if (head === EMPTY_TREE) baseRef = 'empty-tree';
  const mode = options.head ? 'commit' : options.staged ? 'staged' : 'worktree';
  const dirty =
    mode === 'commit'
      ? false
      : (
          await git(root, [
            'status',
            '--porcelain=v1',
            '-z',
            '--untracked-files=normal',
          ])
        ).length > 0;
  return {
    root,
    mode,
    base: { ref: baseRef, sha: base },
    current: {
      ref: options.head ?? (options.staged ? 'index' : 'working-tree'),
      sha: head,
      dirty,
    },
  };
}
