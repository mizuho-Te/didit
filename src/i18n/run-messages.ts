import type { Language } from '../rules/types.js';
const en = {
  cleanupFailed: 'Unable to remove every temporary worktree',
  missingCommand: 'No test command was configured',
  interrupted:
    'Test execution was interrupted; temporary worktrees were cleaned up',
  invalidJunit: 'JUnit report is missing, invalid, or has inconsistent counts',
  unsafePath: 'Run artifact paths must remain inside the selected repository',
  failing: (code: number | null) => `Tests are failing (exit ${String(code)})`,
  decreased: (before: number, after: number) =>
    `Fewer tests ran (${String(before)} → ${String(after)})`,
  skipped: (before: number, after: number) =>
    `More tests were skipped (${String(before)} → ${String(after)})`,
};
const ja: typeof en = {
  cleanupFailed: '一部の一時作業ツリーを削除できませんでした',
  missingCommand: 'テストコマンドが設定されていません',
  interrupted: 'テスト実行が中断され、一時作業ツリーを削除しました',
  invalidJunit: 'JUnit レポートがないか、不正または件数が矛盾しています',
  unsafePath: '実行結果のパスは選択したリポジトリ内に指定してください',
  failing: (code) => `テストが失敗しています（終了コード ${String(code)}）`,
  decreased: (before, after) =>
    `実行されたテストの数が減りました（${String(before)} → ${String(after)}）`,
  skipped: (before, after) =>
    `スキップされたテストが増えました（${String(before)} → ${String(after)}）`,
};
export function runMessages(lang: Language) {
  return lang === 'ja' ? ja : en;
}

export const runRuleMetadata = [
  {
    id: 'run-tests-failing',
    defaultSeverity: 'high',
    description: { en: 'Tests are failing', ja: 'テストが失敗しています' },
  },
  {
    id: 'run-test-count-decreased',
    defaultSeverity: 'high',
    description: {
      en: 'Fewer tests ran',
      ja: '実行されたテストの数が減りました',
    },
  },
  {
    id: 'run-skipped-increased',
    defaultSeverity: 'high',
    description: {
      en: 'More tests were skipped',
      ja: 'スキップされたテストが増えました',
    },
  },
] as const;
