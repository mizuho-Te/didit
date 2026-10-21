import picomatch from 'picomatch';
import type { IgnoreEntry } from './config.js';
import { configMessages } from './i18n/config-messages.js';
import type { FileDiff, Finding, Language, Report } from './rules/types.js';

interface Directive {
  line: number;
  ruleId?: string;
  reason: string;
}

// Only scan comments, never ordinary quoted strings. Preserve line numbers
// across multiline comments, template strings, and Python triple quotes.
export function suppressionComments(
  content: string,
  language: FileDiff['language'],
): Directive[] {
  const comments: { line: number; text: string }[] = [];
  let line = 1;
  let index = 0;
  while (index < content.length) {
    const char = content[index];
    if (char === '\n') {
      line++;
      index++;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      const delimiter =
        language === 'py' && content.slice(index, index + 3) === char.repeat(3)
          ? char.repeat(3)
          : char;
      index += delimiter.length;
      while (index < content.length) {
        if (content[index] === '\\') {
          if (content[index + 1] === '\n') line++;
          index += 2;
        } else if (
          content.slice(index, index + delimiter.length) === delimiter
        ) {
          index += delimiter.length;
          break;
        } else {
          if (content[index] === '\n') line++;
          index++;
        }
      }
      continue;
    }
    if (content.startsWith('//', index) || char === '#') {
      const end = content.indexOf('\n', index);
      const stop = end < 0 ? content.length : end;
      comments.push({
        line,
        text: content.slice(index + (char === '#' ? 1 : 2), stop),
      });
      index = stop;
      continue;
    }
    if (content.startsWith('/*', index)) {
      const end = content.indexOf('*/', index + 2);
      const stop = end < 0 ? content.length : end;
      for (const text of content.slice(index + 2, stop).split('\n'))
        comments.push({ line: line++, text });
      line--;
      index = end < 0 ? stop : end + 2;
      continue;
    }
    index++;
  }
  return comments.flatMap(({ line, text }) => {
    const match = /\bdidit-ok(?:\(([a-z0-9-]+)\))?\s*:\s*(.*)/.exec(text);
    return match
      ? [
          {
            line,
            ...(match[1] === undefined ? {} : { ruleId: match[1] }),
            reason: (match[2] ?? '').trim(),
          },
        ]
      : [];
  });
}

export function applySuppressions(
  file: FileDiff,
  findings: Finding[],
  content: string | null,
  ignore: readonly IgnoreEntry[],
  lang: Language,
): { findings: Finding[]; suppressionsAdded: Report['suppressionsAdded'] } {
  const directives =
    content === null ? [] : suppressionComments(content, file.language);
  const addedLines = new Set(
    file.hunks.flatMap((hunk) =>
      hunk.lines
        .filter((line) => line.type === 'add')
        .map((line) => line.newLine),
    ),
  );
  const suppressionsAdded = directives
    .filter((directive) => addedLines.has(directive.line))
    .map((directive) => ({ file: file.path, ...directive }));
  return {
    suppressionsAdded,
    findings: findings.map((finding) => {
      if (finding.ruleId === 'didit-config-changed') return finding;
      const configured = ignore.find(
        (entry) =>
          entry.rule === finding.ruleId &&
          picomatch(entry.path, { dot: true })(file.path) &&
          entry.reason.trim(),
      );
      if (configured)
        return {
          ...finding,
          suppressed: { reason: configured.reason, source: 'config' },
        };
      if (file.status === 'deleted') return finding;
      const applicable = directives.filter((directive) => {
        if (finding.side === 'removed' || finding.side === 'file')
          return directive.ruleId === finding.ruleId;
        return (
          finding.side === 'added' &&
          finding.line !== undefined &&
          (directive.line === finding.line ||
            directive.line === finding.line - 1) &&
          (directive.ruleId === undefined ||
            directive.ruleId === finding.ruleId)
        );
      });
      const valid = applicable.find((directive) => directive.reason.length > 0);
      if (valid)
        return {
          ...finding,
          suppressed: { reason: valid.reason, source: 'comment' },
        };
      return applicable.length
        ? {
            ...finding,
            message: `${finding.message} (${configMessages(lang).missingReason})`,
          }
        : finding;
    }),
  };
}
