import { stripVTControlCharacters } from 'node:util';
import { messages } from '../i18n/index.js';
import type { Report } from '../rules/types.js';

/** Remove terminal instructions from repository-controlled text before adding trusted colors. */
function safeText(value: string): string {
  return Array.from(stripVTControlCharacters(value))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return (
        code === 9 || code === 10 || (code >= 32 && (code < 127 || code > 159))
      );
    })
    .join('');
}

export function renderText(
  report: Report,
  quiet = false,
  color = false,
): string {
  const text = messages(report.lang);
  const summary = `${text.summary}: high ${String(report.summary.high)} / medium ${String(report.summary.medium)} / low ${String(report.summary.low)} (${text.suppressed} ${String(report.summary.suppressed)}; ${text.skipped} ${String(report.summary.filesSkipped)})`;
  if (quiet) return `${summary}\n`;
  const lines = [
    `didit — ${safeText(report.range.base.ref)}...${safeText(report.range.current.ref)} (${text.changes}: ${String(report.summary.filesChanged)})`,
    '',
  ];
  if (report.summary.filesChanged === 0)
    lines.push(text.noChanges, text.baseHint);
  const weight = { high: 0, medium: 1, low: 2 };
  for (const finding of [...report.findings].sort(
    (a, b) => weight[a.severity] - weight[b.severity],
  )) {
    const severity = color
      ? `\u001b[${finding.severity === 'high' ? '31' : '33'}m${finding.severity}\u001b[0m`
      : finding.severity;
    lines.push(
      `${severity} ${safeText(finding.file ?? '')}${finding.line === undefined ? '' : `:${String(finding.line)}`} ${safeText(finding.message)} [${safeText(finding.ruleId)}]${finding.suppressed === undefined ? '' : ` (${text.suppressed}: ${safeText(finding.suppressed.reason)})`}`,
    );
    if (finding.before !== undefined)
      lines.push(`  - ${safeText(finding.before)}`);
    if (finding.after !== undefined)
      lines.push(`  + ${safeText(finding.after)}`);
  }
  if (report.suppressionsAdded.length > 0) {
    lines.push('', text.addedSuppressions);
    for (const item of report.suppressionsAdded)
      lines.push(
        `  ${safeText(item.file)}:${String(item.line)} ${safeText(item.ruleId ?? '*')}: ${safeText(item.reason)}`,
      );
  }
  if (report.runs !== undefined) {
    lines.push('', `${text.tests}: ${safeText(report.runs.current.command)}`);
    for (const run of [report.runs.base, report.runs.current]) {
      if (run === undefined) continue;
      lines.push(
        `  ${run.side} (${safeText(run.sha)}${run.dirty ? '+dirty' : ''}) ${run.counts === undefined ? `exit ${String(run.exitCode)}` : `${String(run.counts.passed)} ${text.passed} / ${String(run.counts.failed)} ${text.failed} / ${String(run.counts.skipped)} ${text.testSkipped}`}`,
      );
    }
  } else lines.push('', text.notRun);
  lines.push('', summary, text.hint);
  return `${lines.join('\n')}\n`;
}
