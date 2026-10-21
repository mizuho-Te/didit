import { describe, expect, it } from 'vitest';
import { applySuppressions, suppressionComments } from '../src/suppress.js';
import { addedHunks } from '../src/diff/parse.js';
import type { FileDiff, Finding } from '../src/rules/types.js';

const finding: Finding = {
  ruleId: 'any-added',
  severity: 'medium',
  category: 'suppression',
  file: 'src/a.ts',
  line: 2,
  side: 'added',
  message: 'Finding',
};
function apply(
  content: string | null,
  item: Finding = finding,
  status: FileDiff['status'] = 'modified',
) {
  const file: FileDiff = {
    path: 'src/a.ts',
    status,
    hunks: addedHunks(content ?? ''),
    isBinary: false,
    language: 'ts',
    isTestFile: false,
  };
  return applySuppressions(file, [item], content, [], 'en');
}
describe('comment suppressions', () => {
  it.each([
    '// didit-ok: SDK mismatch\nconst a: any = 1;',
    'const a = 1;\nconst b: any = 1; /* didit-ok: SDK mismatch */',
    '# didit-ok(any-added): SDK mismatch\nconst a: any = 1;',
  ])('suppresses same or preceding comments and lists additions', (content) => {
    const result = apply(content);
    expect(result.findings[0]?.suppressed).toEqual({
      source: 'comment',
      reason: 'SDK mismatch',
    });
    expect(result.suppressionsAdded).toHaveLength(1);
  });
  it('does not suppress wrong rules or nonadjacent comments', () => {
    expect(
      apply('// didit-ok(test-skip-added): reason\nconst a: any = 1;')
        .findings[0]?.suppressed,
    ).toBeUndefined();
    expect(
      apply('// didit-ok: reason\n\nconst a: any = 1;', { ...finding, line: 3 })
        .findings[0]?.suppressed,
    ).toBeUndefined();
  });
  it('annotates empty reasons without suppression, retaining additions', () => {
    const result = apply('// didit-ok:  \nconst a: any = 1;');
    expect(result.findings[0]?.suppressed).toBeUndefined();
    expect(result.findings[0]?.message).toContain('no reason');
    expect(result.suppressionsAdded[0]?.reason).toBe('');
  });
  it.each(['file', 'removed'] as const)(
    'requires a targeted comment anywhere for %s findings',
    (side) => {
      expect(
        apply('// didit-ok(any-added): retired\n\n\n', { ...finding, side })
          .findings[0]?.suppressed?.reason,
      ).toBe('retired');
      expect(
        apply('// didit-ok: retired\n\n\n', { ...finding, side }).findings[0]
          ?.suppressed,
      ).toBeUndefined();
    },
  );
  it('does not use removed content or suppress the configuration rule', () => {
    expect(
      apply(null, { ...finding, side: 'file' }, 'deleted').findings[0]
        ?.suppressed,
    ).toBeUndefined();
    expect(
      apply('// didit-ok(didit-config-changed): test\n', {
        ...finding,
        ruleId: 'didit-config-changed',
        side: 'file',
      }).findings[0]?.suppressed,
    ).toBeUndefined();
  });
  it('ignores quoted directives and recognizes multiline comments', () => {
    expect(
      suppressionComments(
        'const text = "// didit-ok: fake";\nconst escaped = "\\" # didit-ok: fake";\n`// didit-ok: fake\nmore`;\n/*\n * didit-ok: real\n */',
        'ts',
      ),
    ).toEqual([{ line: 6, reason: 'real' }]);
    expect(
      suppressionComments('"""\n# didit-ok: fake\n"""\n# didit-ok: real', 'py'),
    ).toEqual([{ line: 4, reason: 'real' }]);
    expect(suppressionComments('/* didit-ok: incomplete', 'ts')).toEqual([
      { line: 1, reason: 'incomplete' },
    ]);
  });
  it('lists only directives on newly added lines', () => {
    const file: FileDiff = {
      path: 'a.ts',
      status: 'modified',
      hunks: [],
      isBinary: false,
      language: 'ts',
      isTestFile: false,
    };
    expect(
      applySuppressions(
        file,
        [finding],
        '// didit-ok: old\nconst a: any = 1;',
        [],
        'en',
      ).suppressionsAdded,
    ).toEqual([]);
  });
  it('supports configuration ignores for deleted files but never the protected rule', () => {
    const file: FileDiff = {
      path: 'src/a.ts',
      status: 'deleted',
      hunks: [],
      isBinary: false,
      language: 'ts',
      isTestFile: false,
    };
    expect(
      applySuppressions(
        file,
        [finding],
        null,
        [{ rule: 'any-added', path: 'src/**', reason: 'retired' }],
        'en',
      ).findings[0]?.suppressed,
    ).toEqual({ source: 'config', reason: 'retired' });
    expect(
      applySuppressions(
        file,
        [{ ...finding, ruleId: 'didit-config-changed' }],
        null,
        [{ rule: 'didit-config-changed', path: '**', reason: 'retired' }],
        'en',
      ).findings[0]?.suppressed,
    ).toBeUndefined();
  });
});
