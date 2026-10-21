import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { git } from '../git/exec.js';
import { EMPTY_TREE } from '../git/range.js';
import { messages } from '../i18n/index.js';
import { reportMessages } from '../i18n/report-messages.js';
import type { Options } from '../options.js';
import type { FileDiff, Report } from '../rules/types.js';
import { escapeMarkdown, findingsTable, renderMarkdown } from './markdown.js';

async function rejectSymlinkPath(
  target: string,
  errorMessage: string,
): Promise<void> {
  const parsed = path.parse(target);
  let current = parsed.root;
  for (const part of target
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error(errorMessage);
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
    }
  }
}

export async function resolveGoal(
  root: string,
  report: Report,
  explicit?: string,
): Promise<string> {
  if (explicit !== undefined) return explicit;
  const goalPath = path.join(await realpath(root), '.didit', 'goal.md');
  await rejectSymlinkPath(goalPath, reportMessages(report.lang).invalidOutput);
  try {
    const goal = await readFile(goalPath, 'utf8');
    if (goal.trim()) return goal.trim();
  } catch (error: unknown) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error;
  }
  if (
    report.range.current.sha !== EMPTY_TREE &&
    report.range.base.sha !== report.range.current.sha
  ) {
    const revision =
      report.range.base.sha === EMPTY_TREE
        ? report.range.current.sha
        : `${report.range.base.sha}..${report.range.current.sha}`;
    const subject = (
      await git(root, ['log', '-1', '--format=%s', revision, '--'])
    ).trim();
    if (subject) return subject;
  }
  return reportMessages(report.lang).unspecified;
}
export function openItems(report: Report, files: FileDiff[]): string[] {
  const text = reportMessages(report.lang);
  const items = files
    .filter(
      (file) => ['ts', 'js', 'py'].includes(file.language) && !file.isTestFile,
    )
    .filter(
      (file) =>
        !files.some(
          (test) =>
            test.isTestFile &&
            path.posix
              .basename(test.path)
              .includes(
                path.posix.basename(file.path, path.posix.extname(file.path)),
              ),
        ),
    )
    .map((file) => `${text.inferred}: ${file.path}`);
  for (const entry of report.suppressionsAdded)
    items.push(
      `${messages(report.lang).addedSuppressions}: ${entry.file}:${String(entry.line)}: ${entry.reason}`,
    );
  if (!report.runs) items.push(messages(report.lang).notRun);
  return items;
}
export async function writeHandoff(
  report: Report,
  files: FileDiff[],
  root: string,
  options: Pick<Options, 'goal' | 'outDir'>,
): Promise<void> {
  const labels = reportMessages(report.lang);
  const goal = await resolveGoal(root, report, options.goal);
  const items = openItems(report, files);
  const lines = [
    `# Handoff — ${escapeMarkdown(path.basename(root))} (${escapeMarkdown(report.range.base.ref)}..${escapeMarkdown(report.range.current.ref)})`,
    `${report.generatedAt} / didit ${report.tool.version}`,
    '',
    `## ${labels.goal}`,
    escapeMarkdown(goal),
    '',
    `## ${labels.changedFiles}`,
    `| ${labels.file} | ${labels.status} | + | - |`,
    '|---|---|---|---|',
  ];
  for (const file of files)
    lines.push(
      `| ${escapeMarkdown(file.path)} | ${file.status} | ${String(file.hunks.flatMap((h) => h.lines).filter((line) => line.type === 'add').length)} | ${String(file.hunks.flatMap((h) => h.lines).filter((line) => line.type === 'del').length)} |`,
    );
  lines.push('', `## ${labels.verified}`);
  if (report.runs) {
    lines.push(
      `| ${labels.run} | SHA | ${labels.when} | ${labels.result} |`,
      '|---|---|---|---|',
    );
    for (const run of [report.runs.base, report.runs.current])
      if (run)
        lines.push(
          `| ${run.side}: ${escapeMarkdown(run.command)} | ${escapeMarkdown(run.sha)} | ${run.startedAt} | exit ${String(run.exitCode)}; ${String(run.durationMs)} ms |`,
        );
  } else lines.push(messages(report.lang).notRun);
  lines.push(
    '',
    `## ${labels.review}`,
    findingsTable(
      report.findings.filter((f) => !f.suppressed && f.severity !== 'low'),
      report.lang,
    ),
    '',
    `## ${labels.open}`,
    ...items.map((item) => `- ${escapeMarkdown(item)}`),
    '',
    `## ${labels.next}`,
    ...labels.instructions.map(
      (item, index) => `${String(index + 1)}. ${item}`,
    ),
    '',
    '<details><summary>didit</summary>',
    '',
    renderMarkdown(report),
    '</details>',
    '',
  );
  const directory = path.resolve(await realpath(root), options.outDir);
  await rejectSymlinkPath(directory, labels.invalidOutput);
  await mkdir(directory, { recursive: true });
  const outputs = [
    ['handoff.md', lines.join('\n')],
    [
      'handoff.json',
      JSON.stringify({ ...report, goal, openItems: items }, null, 2) + '\n',
    ],
  ] as const;
  for (const [name, content] of outputs) {
    const temporary = path.join(directory, `.${name}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
      await rename(temporary, path.join(directory, name));
    } finally {
      await rm(temporary, { force: true });
    }
  }
}
