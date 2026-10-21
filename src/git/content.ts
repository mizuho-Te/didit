import { gitErrors } from '../i18n/git-errors.js';
import { parseBlobContents, parseBlobSizes } from './batch.js';
import { lstat, readFile, readlink } from 'node:fs/promises';
import path from 'node:path';
import type { FileDiff } from '../rules/types.js';
import { git, gitBuffer, gitInputBuffer } from './exec.js';
import type { ResolvedRange } from './range.js';

async function readContentBuffer(
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
type Side = 'base' | 'current';
interface CachedFile {
  baseSize: number;
  currentSize: number;
  base?: Buffer | null;
  current?: Buffer | null;
}
const contentCache = new WeakMap<ResolvedRange, Map<FileDiff, CachedFile>>();
const retainedBytes = new WeakMap<ResolvedRange, number>();
const MAX_CACHE_BYTES = 32 * 1024 * 1024;

export async function getContentBuffer(
  range: ResolvedRange,
  file: FileDiff,
  side: Side,
): Promise<Buffer | null> {
  if (file.contentOmitted) return null;
  const cached = contentCache.get(range)?.get(file);
  const value = cached?.[side];
  if (value !== undefined) return value;
  const result = await readContentBuffer(range, file, side);
  const used = retainedBytes.get(range) ?? 0;
  if (cached && used + (result?.length ?? 0) <= MAX_CACHE_BYTES) {
    cached[side] = result;
    retainedBytes.set(range, used + (result?.length ?? 0));
  }
  return result;
}

/** Resolve paths with NUL delimiters; batch stdin contains only validated object IDs. */
async function objectPaths(
  range: ResolvedRange,
  side: Side,
  files: FileDiff[],
): Promise<Map<string, string | null>> {
  if (side === 'current' && range.mode === 'worktree') return new Map();
  const index = side === 'current' && range.mode === 'staged';
  const ref = side === 'base' ? range.base.sha : range.current.sha;
  const requested = [
    ...new Set(
      files
        .filter((file) =>
          side === 'base' ? file.status !== 'added' : file.status !== 'deleted',
        )
        .map((file) =>
          side === 'base' ? (file.oldPath ?? file.path) : file.path,
        ),
    ),
  ];
  const paths = new Map<string, string | null>();
  // Leave ample room below Windows' command-line limit, including quoting.
  const groups: string[][] = [];
  let group: string[] = [];
  let characters = 0;
  for (const name of requested) {
    if (characters + name.length * 2 + 3 > 8000 && group.length > 0) {
      groups.push(group);
      group = [];
      characters = 0;
    }
    group.push(name);
    characters += name.length * 2 + 3;
  }
  if (group.length > 0) groups.push(group);
  for (const names of groups) {
    const output = await git(
      range.root,
      index
        ? ['ls-files', '--stage', '-z', '--', ...names]
        : ['ls-tree', '-r', '-z', ref, '--', ...names],
    );
    for (const record of output.split('\0')) {
      if (!record) continue;
      const tab = record.indexOf('\t');
      const metadata = record.slice(0, tab).split(' ');
      const oid = metadata[index ? 1 : 2];
      if (tab < 0 || !oid || !/^[a-f0-9]{40,64}$/.test(oid))
        throw new Error(gitErrors.invalidObjectMetadata);
      if (index && metadata[2] !== '0') continue;
      paths.set(record.slice(tab + 1), metadata[0] === '160000' ? null : oid);
    }
  }
  return paths;
}

/** Preload bounded blobs in a constant number of Git children, not one child per file. */
export async function prepareContents(
  range: ResolvedRange,
  files: FileDiff[],
  maxBytes: number,
): Promise<void> {
  const [basePaths, currentPaths] = await Promise.all([
    objectPaths(range, 'base', files),
    objectPaths(range, 'current', files),
  ]);
  const objectIds = new Map<
    FileDiff,
    { base?: string; current?: string; unsupported?: boolean }
  >();
  const unique = new Set<string>();
  for (const file of files) {
    const entry: { base?: string; current?: string; unsupported?: boolean } =
      {};
    if (file.status !== 'added') {
      const oid = basePaths.get(file.oldPath ?? file.path);
      if (oid === undefined) throw new Error(gitErrors.missingBaseObject);
      if (oid === null) entry.unsupported = true;
      else {
        entry.base = oid;
        unique.add(oid);
      }
    }
    if (file.status !== 'deleted' && range.mode !== 'worktree') {
      const oid = currentPaths.get(file.path);
      if (oid === undefined) throw new Error(gitErrors.missingCurrentObject);
      if (oid === null) entry.unsupported = true;
      else {
        entry.current = oid;
        unique.add(oid);
      }
    }
    objectIds.set(file, entry);
  }
  let sizes = new Map<string, number>();
  if (unique.size > 0) {
    const output = await gitInputBuffer(
      range.root,
      ['cat-file', '--batch-check'],
      Buffer.from([...unique].join('\n') + '\n'),
    );
    sizes = parseBlobSizes(output, [...unique]);
  }
  const cache = new Map<FileDiff, CachedFile>();
  const wanted = new Set<string>();
  let preloadBytes = 0;
  function want(oid: string | undefined): void {
    if (!oid || wanted.has(oid)) return;
    const size = sizes.get(oid) ?? 0;
    if (preloadBytes + size + 100 > MAX_CACHE_BYTES) return;
    wanted.add(oid);
    preloadBytes += size + 100;
  }
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(8, files.length) }, async () => {
      while (next < files.length) {
        const file = files[next++];
        if (!file) continue;
        const ids = objectIds.get(file);
        if (ids?.unsupported) {
          cache.set(file, {
            baseSize: Infinity,
            currentSize: Infinity,
            base: null,
            current: null,
          });
          continue;
        }
        const baseSize = ids?.base ? sizes.get(ids.base) : 0;
        const currentSize =
          range.mode === 'worktree' && file.status !== 'deleted'
            ? (await lstat(path.join(range.root, file.path))).size
            : ids?.current
              ? sizes.get(ids.current)
              : 0;
        if (baseSize === undefined || currentSize === undefined)
          throw new Error(gitErrors.missingBlobSize);
        cache.set(file, {
          baseSize,
          currentSize,
          ...(file.status === 'added' ? { base: null } : {}),
          ...(file.status === 'deleted' ? { current: null } : {}),
        });
        if (baseSize <= maxBytes && currentSize <= maxBytes) {
          want(ids?.base);
          want(ids?.current);
        }
      }
    }),
  );
  const blobs = new Map<string, Buffer>();
  // Cap each response below execFile's output bound, including batch headers.
  const groups: string[][] = [];
  let group: string[] = [];
  let bytes = 0;
  for (const oid of wanted) {
    const size = sizes.get(oid) ?? 0;
    if (bytes + size > 16 * 1024 * 1024 && group.length > 0) {
      groups.push(group);
      group = [];
      bytes = 0;
    }
    group.push(oid);
    bytes += size + 100;
  }
  if (group.length > 0) groups.push(group);
  for (const ids of groups) {
    const output = await gitInputBuffer(
      range.root,
      ['cat-file', '--batch'],
      Buffer.from(ids.join('\n') + '\n'),
    );
    for (const [oid, buffer] of parseBlobContents(output, ids, sizes))
      blobs.set(oid, buffer);
  }
  for (const [file, entry] of cache) {
    const ids = objectIds.get(file);
    if (ids?.base && blobs.has(ids.base))
      entry.base = blobs.get(ids.base) ?? null;
    if (ids?.current && blobs.has(ids.current))
      entry.current = blobs.get(ids.current) ?? null;
  }
  contentCache.set(range, cache);
  retainedBytes.set(range, preloadBytes);
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
  const cached = contentCache.get(range)?.get(file);
  if (cached) return side === 'base' ? cached.baseSize : cached.currentSize;
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
