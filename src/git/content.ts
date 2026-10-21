import { lstat, readFile, readlink } from 'node:fs/promises';
import path from 'node:path';
import type { FileDiff } from '../rules/types.js';
import { git, gitBuffer } from './exec.js';
import type { ResolvedRange } from './range.js';

export async function getContentBuffer(
  range: ResolvedRange,
  file: FileDiff,
  side: 'base' | 'current',
): Promise<Buffer | null> {
  if (file.contentOmitted) return null;
  if (
    (side === 'base' && file.status === 'added') ||
    (side === 'current' && file.status === 'deleted')
  )
    return null;
  const name = side === 'base' ? (file.oldPath ?? file.path) : file.path;
  if (side === 'current' && range.mode === 'worktree') {
    const target = path.join(range.root, name);
    const stat = await lstat(target);
    // Read the link itself, never a target outside the repository.
    if (stat.isSymbolicLink()) return Buffer.from(await readlink(target));
    if (!stat.isFile()) return null;
    return readFile(target);
  }
  const ref =
    side === 'base'
      ? range.base.sha
      : range.mode === 'staged'
        ? ''
        : range.current.sha;
  return gitBuffer(range.root, ['show', `${ref}:${name}`]);
}
export async function getContent(
  range: ResolvedRange,
  file: FileDiff,
  side: 'base' | 'current',
): Promise<string | null> {
  const buffer = await getContentBuffer(range, file, side);
  return buffer?.toString('utf8') ?? null;
}

export async function getContentSize(
  range: ResolvedRange,
  file: FileDiff,
  side: 'base' | 'current',
): Promise<number> {
  if (
    (side === 'base' && file.status === 'added') ||
    (side === 'current' && file.status === 'deleted')
  )
    return 0;
  const name = side === 'base' ? (file.oldPath ?? file.path) : file.path;
  if (side === 'current' && range.mode === 'worktree')
    return (await lstat(path.join(range.root, name))).size;
  const ref =
    side === 'base'
      ? range.base.sha
      : range.mode === 'staged'
        ? ''
        : range.current.sha;
  return Number(
    (await git(range.root, ['cat-file', '-s', `${ref}:${name}`])).trim(),
  );
}
