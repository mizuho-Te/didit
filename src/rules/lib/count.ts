import type { FileLanguage } from '../types.js';
/** Count declarations, not expanded parameterized test cases. */
export function countTests(
  content: string,
  language: FileLanguage = 'ts',
): number {
  if (language === 'py')
    return [...content.matchAll(/^\s*(?:async\s+)?def\s+test_\w*\s*\(/gm)]
      .length;
  return [
    ...content.matchAll(
      /\b(?:it|test)(?:\.(?:concurrent|failing|sequential))*\s*\(\s*['"`]|\b(?:it|test)(?:\.(?:concurrent|failing|sequential))*\.each\s*\([^\n]*?\)\s*\(\s*['"`]/g,
    ),
  ].length;
}
export function countAssertions(
  content: string,
  language: FileLanguage = 'ts',
): number {
  if (language === 'py')
    return [
      ...content.matchAll(
        /^\s*assert\b|\bself\.assert\w+\s*\(|\bpytest\.raises\s*\(/gm,
      ),
    ].length;
  return [...content.matchAll(/\bexpect\s*\(|\bassert(?:\.\w+)?\s*\(/g)].length;
}
