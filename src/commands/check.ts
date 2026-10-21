import { executeRuns } from '../run/runner.js';
import { collectRunFindings } from '../run/findings.js';
import { writeHandoff } from '../report/handoff.js';
import { loadConfig, resolveConfig } from '../config.js';
import { applySuppressions } from '../suppress.js';
import { resolveRange } from '../git/range.js';
import { collectDiffs } from '../git/diff.js';
import { getContent } from '../git/content.js';
import { messages, resolveLanguage } from '../i18n/index.js';
import type { Options } from '../options.js';
import { runRules } from '../rules/index.js';
import type { Report } from '../rules/types.js';

export async function check(
  options: Options,
  cwd = process.cwd(),
  onWarning: (warning: string) => void = (warning) => {
    process.stderr.write(`${warning}\n`);
  },
): Promise<Report> {
  const range = await resolveRange(cwd, {
    ...(options.base === undefined ? {} : { base: options.base }),
    ...(options.head === undefined ? {} : { head: options.head }),
    staged: options.staged,
  });
  const config = resolveConfig(
    options,
    await loadConfig(range.root, options.config, resolveLanguage(options.lang)),
  );
  const lang = config.lang;
  const changes = await collectDiffs(range, config);
  const suppressionsAdded: Report['suppressionsAdded'] = [];
  const findings: Report['findings'] = [];
  for (const file of changes.files) {
    let baseContent: Promise<string | null> | undefined;
    let currentContent: Promise<string | null> | undefined;
    const context = {
      file,
      lang,
      getBaseContent: () => (baseContent ??= getContent(range, file, 'base')),
      getCurrentContent: () =>
        (currentContent ??= getContent(range, file, 'current')),
    };
    const detected = await runRules(context, config.rules, (ruleId, error) => {
      onWarning(
        `${messages(lang).ruleFailure}: ${ruleId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
    const result = applySuppressions(
      file,
      detected,
      await context.getCurrentContent(),
      config.ignore,
      lang,
    );
    findings.push(...result.findings);
    suppressionsAdded.push(...result.suppressionsAdded);
  }
  const runs =
    config.run === undefined ? undefined : await executeRuns(range, config);
  if (runs !== undefined)
    findings.push(...collectRunFindings(runs, lang, config.rules));
  const failOn = config.failOn;
  const severity = { high: 3, medium: 2, low: 1, none: 4 };
  const report: Report = {
    schemaVersion: 1,
    tool: { name: 'didit', version: '0.2.0' },
    generatedAt: new Date().toISOString(),
    lang,
    range: { mode: range.mode, base: range.base, current: range.current },
    summary: {
      filesChanged: changes.filesChanged,
      filesSkipped: changes.filesSkipped,
      high: findings.filter(
        (item) => item.severity === 'high' && !item.suppressed,
      ).length,
      medium: findings.filter(
        (item) => item.severity === 'medium' && !item.suppressed,
      ).length,
      low: findings.filter(
        (item) => item.severity === 'low' && !item.suppressed,
      ).length,
      suppressed: findings.filter((item) => item.suppressed).length,
      failOn,
      failed: findings.some(
        (item) =>
          !item.suppressed && severity[item.severity] >= severity[failOn],
      ),
    },
    findings,
    suppressionsAdded,
    ...(runs === undefined ? {} : { runs }),
  };
  if (options.handoff)
    await writeHandoff(report, changes.files, range.root, options);
  return report;
}
