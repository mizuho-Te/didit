import { z } from 'zod';
import { integrationMessages } from '../i18n/integration-messages.js';
import { resolveLanguage } from '../i18n/index.js';
import { optionsSchema } from '../options.js';
import { escapeMarkdown } from '../report/markdown.js';
import { check } from './check.js';

export const MAX_HOOK_INPUT_BYTES = 1024 * 1024;
const hookInput = z.object({
  stop_hook_active: z.boolean().default(false),
  hook_event_name: z.literal('Stop').optional(),
});
export interface HookResult {
  exitCode: 0 | 1 | 2;
  stderr: string;
}

export async function runHook(
  input: unknown,
  cwd = process.cwd(),
): Promise<HookResult> {
  let text = integrationMessages(resolveLanguage());
  const warnings: string[] = [];
  try {
    let value: unknown = input;
    if (typeof input === 'string') {
      if (Buffer.byteLength(input) > MAX_HOOK_INPUT_BYTES)
        throw new Error(text.inputTooLarge);
      try {
        value = JSON.parse(input);
      } catch {
        throw new Error(text.invalidInput);
      }
    }
    const parsed = hookInput.safeParse(value);
    if (!parsed.success) throw new Error(text.invalidInput);
    if (parsed.data.stop_hook_active) return { exitCode: 0, stderr: '' };
    const report = await check(optionsSchema.parse({}), cwd, (warning) =>
      warnings.push(warning),
    );
    text = integrationMessages(report.lang);
    if (!report.summary.failed)
      return {
        exitCode: warnings.length ? 1 : 0,
        stderr: warnings.length ? warnings.join('\n') + '\n' : '',
      };
    const rank = { high: 3, medium: 2, low: 1, none: 4 };
    const findings = report.findings
      .filter(
        (finding) =>
          !finding.suppressed &&
          rank[finding.severity] >= rank[report.summary.failOn],
      )
      .sort((a, b) => rank[b.severity] - rank[a.severity]);
    const lines = [`## ${text.findings}`, '', text.repair, ''];
    for (const finding of findings.slice(0, 20)) {
      const location =
        finding.file === undefined
          ? ''
          : `${finding.file}${finding.line === undefined ? '' : ':' + String(finding.line)}: `;
      lines.push(
        `- **${finding.severity}** ${escapeMarkdown(location + finding.message)} [${finding.ruleId}]`,
      );
    }
    if (findings.length > 20)
      lines.push('', text.omitted(findings.length - 20));
    return { exitCode: 2, stderr: [...warnings, ...lines].join('\n') + '\n' };
  } catch (error: unknown) {
    return {
      exitCode: 1,
      stderr:
        [
          ...warnings,
          `${text.hookError}: ${error instanceof Error ? error.message : String(error)}`,
        ].join('\n') + '\n',
    };
  }
}
