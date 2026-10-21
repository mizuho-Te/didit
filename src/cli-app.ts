import { init } from './commands/init.js';
import { runHook } from './commands/hook.js';
import { readHookInput } from './commands/hook-input.js';
import { check } from './commands/check.js';
import { messages, resolveLanguage } from './i18n/index.js';
import { parseOptions } from './options.js';
import { renderMarkdown } from './report/markdown.js';
import { renderJson } from './report/json.js';
import { renderText } from './report/text.js';
import { rules } from './rules/index.js';
import { runRuleMetadata } from './run/findings.js';

export interface CliResult {
  exitCode: 0 | 1 | 2;
  stdout: string;
  stderr: string;
}
export async function runCli(
  args: readonly string[],
  version: string,
  cwd = process.cwd(),
  input?: string,
): Promise<CliResult> {
  const warnings: string[] = [];
  let lang = resolveLanguage();
  try {
    const invocation = parseOptions(args);
    const { options } = invocation;
    lang = resolveLanguage(options.lang);
    if (invocation.command === 'version')
      return { exitCode: 0, stdout: `${version}\n`, stderr: '' };
    if (invocation.command === 'help')
      return { exitCode: 0, stdout: `${messages(lang).help}\n`, stderr: '' };
    if (invocation.command === 'rules')
      return {
        exitCode: 0,
        stdout: `${[...rules.map((rule) => ({ id: rule.id, defaultSeverity: rule.defaultSeverity, description: rule.meta.description })), ...runRuleMetadata].map((rule) => `${rule.id} [${rule.defaultSeverity}] ${rule.description[lang]}`).join('\n')}\n`,
        stderr: '',
      };
    if (invocation.command === 'init')
      return {
        exitCode: 0,
        stdout: await init(invocation.target, cwd, lang),
        stderr: '',
      };
    if (invocation.command === 'hook') {
      try {
        if (invocation.target !== 'claude')
          throw new Error(messages(lang).invalidOption);
        const result = await runHook(
          input ?? (await readHookInput(process.stdin, lang)),
          cwd,
        );
        return { ...result, stdout: '' };
      } catch (error: unknown) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `${messages(lang).error}: ${error instanceof Error ? error.message : String(error)}\n`,
        };
      }
    }
    const report = await check(options, cwd, (warning) =>
      warnings.push(warning),
    );
    report.tool.version = version;
    const stdout =
      options.format === 'json'
        ? renderJson(report)
        : options.format === 'markdown'
          ? renderMarkdown(report)
          : renderText(
              report,
              options.quiet,
              options.color &&
                process.stdout.isTTY &&
                process.env.NO_COLOR === undefined,
            );
    return {
      exitCode: report.summary.failed ? 1 : 0,
      stdout,
      stderr: warnings.length ? `${warnings.join('\n')}\n` : '',
    };
  } catch (error: unknown) {
    return {
      exitCode: 2,
      stdout: '',
      stderr: `${messages(lang).error}: ${error instanceof Error ? error.message : String(error)}\n`,
    };
  }
}
