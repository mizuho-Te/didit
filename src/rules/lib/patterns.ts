import type { FileDiff, DiffLine } from '../types.js';
export const isJs = (file: FileDiff): boolean =>
  file.language === 'ts' || file.language === 'js';
export const isJsTest = (file: FileDiff): boolean =>
  isJs(file) && file.isTestFile;
export const addedLines = (file: FileDiff): DiffLine[] =>
  file.hunks.flatMap((hunk) =>
    hunk.lines.filter((line) => line.type === 'add'),
  );
export const isCode = (file: FileDiff): boolean =>
  isJs(file) || file.language === 'py';
export const isCodeTest = (file: FileDiff): boolean =>
  isCode(file) && file.isTestFile;
