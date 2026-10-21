import { gitErrors } from '../i18n/git-errors.js';
import { classifyLanguage, isExcluded, isTestFile } from '../diff/classify.js';
import { addedHunks, parseUnifiedDiff } from '../diff/parse.js';
import type { FileDiff, FileStatus } from '../rules/types.js';
import { getContentBuffer, getContentSize } from './content.js';
import { git } from './exec.js';
import type { ResolvedRange } from './range.js';

export interface DiffOptions {
  exclude?: string[];
  testFilePatterns?: string[];
  maxFileSizeKb?: number;
}

function isProtectedConfig(file: FileDiff): boolean {
  return file.path === '.didit.json' || file.oldPath === '.didit.json';
}

function fileDiff(
  path: string,
  status: FileStatus,
  options: DiffOptions,
): FileDiff {
  return {
    path,
    status,
    hunks: [],
    isBinary: false,
    language: classifyLanguage(path),
    isTestFile: isTestFile(path, options.testFilePatterns),
  };
}
export function parseNameStatus(
  output: string,
  options: DiffOptions = {},
): FileDiff[] {
  const parts = output.split('\0');
  const files: FileDiff[] = [];
  for (let index = 0; index < parts.length - 1;) {
    const status = parts[index++];
    const path = parts[index++];
    if (!status || path === undefined)
      throw new Error(gitErrors.malformedStatus);
    if (status.startsWith('R') || status.startsWith('C')) {
      const current = parts[index++];
      if (!current) throw new Error(gitErrors.missingRename);
      files.push({ ...fileDiff(current, 'renamed', options), oldPath: path });
    } else
      files.push(
        fileDiff(
          path,
          status === 'A' ? 'added' : status === 'D' ? 'deleted' : 'modified',
          options,
        ),
      );
  }
  return files;
}

export async function collectDiffs(
  range: ResolvedRange,
  options: DiffOptions = {},
): Promise<{ files: FileDiff[]; filesChanged: number; filesSkipped: number }> {
  const comparison = [
    range.base.sha,
    ...(range.mode === 'commit'
      ? [range.current.sha]
      : range.mode === 'staged'
        ? ['--cached']
        : []),
  ];
  const common = ['diff', '--no-ext-diff', '--no-textconv', '--no-color', '-M'];
  const [names, untracked] = await Promise.all([
    git(range.root, [...common, '--name-status', '-z', ...comparison, '--']),
    range.mode === 'worktree'
      ? git(range.root, ['ls-files', '--others', '--exclude-standard', '-z'])
      : Promise.resolve(''),
  ]);
  const tracked = parseNameStatus(names, options);
  const all = [
    ...tracked,
    ...untracked
      .split('\0')
      .filter(Boolean)
      .map((name) => fileDiff(name, 'added', options)),
  ].filter(
    (file) =>
      isProtectedConfig(file) || !isExcluded(file.path, options.exclude),
  );
  const untrackedNames = new Set(untracked.split('\0'));
  const accepted = new Map<FileDiff, boolean>();
  let next = 0;
  // Bound subprocess concurrency while keeping content reads off the serial path.
  await Promise.all(
    Array.from({ length: Math.min(8, all.length) }, async () => {
      while (next < all.length) {
        const file = all[next++];
        if (!file) continue;
        const sizes = await Promise.all([
          getContentSize(range, file, 'base'),
          getContentSize(range, file, 'current'),
        ]);
        if (
          sizes.some((size) => size > (options.maxFileSizeKb ?? 1024) * 1024)
        ) {
          accepted.set(file, false);
          continue;
        }
        const buffers = await Promise.all([
          getContentBuffer(range, file, 'base'),
          getContentBuffer(range, file, 'current'),
        ]);
        const skip = buffers.some(
          (buffer) =>
            buffer !== null &&
            (buffer.length > (options.maxFileSizeKb ?? 1024) * 1024 ||
              buffer.subarray(0, 8000).includes(0)),
        );
        accepted.set(file, !skip);
        if (!skip && untrackedNames.has(file.path))
          file.hunks = addedHunks(buffers[1]?.toString('utf8') ?? '');
      }
    }),
  );
  const acceptedTracked = tracked.filter((file) => accepted.get(file));
  if (acceptedTracked.length > 0) {
    const paths = acceptedTracked.flatMap((file) =>
      file.oldPath ? [file.oldPath, file.path] : [file.path],
    );
    const patch = await git(range.root, [
      ...common,
      '-U3',
      ...comparison,
      '--',
      ...paths,
    ]);
    const patches = patch.split(/^diff --git /m).slice(1);
    if (patches.length !== acceptedTracked.length)
      throw new Error(gitErrors.mismatchedFiles);
    acceptedTracked.forEach((file, index) => {
      const body = patches[index] ?? '';
      file.hunks = parseUnifiedDiff(body);
      file.isBinary =
        /^Binary files .* differ$/m.test(body) ||
        /^GIT binary patch$/m.test(body);
      if (file.isBinary) accepted.set(file, false);
    });
  }
  const files = all.filter((file) => {
    if (accepted.get(file)) return true;
    if (!isProtectedConfig(file)) return false;
    file.contentOmitted = true;
    file.hunks = [];
    return true;
  });
  return {
    files,
    filesChanged: all.length,
    filesSkipped: all.filter((file) => !accepted.get(file)).length,
  };
}
