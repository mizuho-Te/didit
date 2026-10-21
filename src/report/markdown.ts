import { stripVTControlCharacters } from 'node:util';
import { messages } from '../i18n/index.js';
import { reportMessages } from '../i18n/report-messages.js';
import type { Finding, Report } from '../rules/types.js';

export function escapeMarkdown(value: string): string {
  return stripVTControlCharacters(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '\\|')
    .replaceAll('`', '&#96;')
    .replace(/\r?\n/g, '<br>');
}
export function findingsTable(
  findings: Finding[],
  lang: Report['lang'],
): string {
  const text = reportMessages(lang);
  const lines = [
    `| ${text.severity} | ${text.location} | ${text.finding} | ${text.evidence} |`,
    '|---|---|---|---|',
  ];
  for (const finding of findings)
    lines.push(
      `| ${finding.severity} | ${escapeMarkdown(finding.file ?? '')}${finding.line === undefined ? '' : ':' + String(finding.line)} | ${escapeMarkdown(finding.message)} [${finding.ruleId}]${finding.suppressed === undefined ? '' : ` (${text.suppressed}: ${escapeMarkdown(finding.suppressed.reason)})`} | ${escapeMarkdown(finding.before ?? '')} → ${escapeMarkdown(finding.after ?? '')} |`,
    );
  return lines.join('\n');
}
export function renderMarkdown(report: Report): string {
  const text = messages(report.lang),
    labels = reportMessages(report.lang);
  const lines = [
    `# didit — ${escapeMarkdown(report.range.base.ref)}...${escapeMarkdown(report.range.current.ref)}`,
    '',
    `${text.changes}: ${String(report.summary.filesChanged)}; ${text.skipped}: ${String(report.summary.filesSkipped)}`,
    '',
  ];
  if (!report.summary.filesChanged)
    lines.push(text.noChanges, text.baseHint, '');
  lines.push(
    findingsTable(
      [...report.findings].sort(
        (a, b) =>
          ({ high: 0, medium: 1, low: 2 })[a.severity] -
          { high: 0, medium: 1, low: 2 }[b.severity],
      ),
      report.lang,
    ),
    '',
  );
  if (report.suppressionsAdded.length) {
    lines.push(
      `## ${text.addedSuppressions}`,
      '',
      `| ${labels.location} | ${labels.reason} |`,
      '|---|---|',
    );
    for (const item of report.suppressionsAdded)
      lines.push(
        `| ${escapeMarkdown(item.file)}:${String(item.line)} | ${escapeMarkdown(item.reason)} |`,
      );
    lines.push('');
  }
  if (report.runs) {
    lines.push(
      `## ${text.tests}`,
      '',
      `| ${labels.run} | SHA | ${labels.result} |`,
      '|---|---|---|',
    );
    for (const run of [report.runs.base, report.runs.current]) {
      if (!run) continue;
      lines.push(
        `| ${run.side}: ${escapeMarkdown(run.command)} | ${escapeMarkdown(run.sha)}${run.dirty ? '+dirty' : ''} | exit ${String(run.exitCode)}${run.counts ? `; ${String(run.counts.passed)} ${text.passed} / ${String(run.counts.failed)} ${text.failed} / ${String(run.counts.skipped)} ${text.testSkipped}` : ''} |`,
      );
    }
    lines.push('', `<details><summary>${labels.details}</summary>`, '');
    for (const run of [report.runs.base, report.runs.current])
      if (run) lines.push(`<pre>${escapeMarkdown(run.logTail)}</pre>`);
    lines.push('', '</details>');
  } else lines.push(text.notRun);
  lines.push(
    '',
    `${text.summary}: high ${String(report.summary.high)} / medium ${String(report.summary.medium)} / low ${String(report.summary.low)} (${text.suppressed} ${String(report.summary.suppressed)})`,
    text.hint,
  );
  return lines.join('\n') + '\n';
}
