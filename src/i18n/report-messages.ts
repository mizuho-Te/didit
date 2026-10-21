import type { Language } from '../rules/types.js';

const en = {
  finding: 'Finding',
  location: 'Location',
  severity: 'Severity',
  evidence: 'Before / after',
  suppressed: 'Suppressed',
  reason: 'Reason',
  run: 'Run',
  result: 'Result',
  details: 'Execution logs',
  when: 'Started at',
  goal: 'Goal',
  unspecified: '(not specified)',
  changedFiles: 'Changed files',
  file: 'File',
  status: 'Status',
  verified: 'Actually verified',
  review: 'Findings for human review',
  open: 'Unverified / unresolved',
  next: 'Instructions for the next contributor',
  inferred: 'No related changed test was found (heuristic)',
  instructions: [
    'Fix the findings above, or explain intentional changes with a reason comment.',
    'After finishing, run npx --no-install didit --run "<test command>".',
    'Do not bypass failures by skipping/deleting tests, weakening assertions, or suppressing type/lint errors.',
  ],
  invalidOutput:
    'Handoff goal and output paths must not contain symbolic links',
};
const ja: { [K in keyof typeof en]: (typeof en)[K] } = {
  finding: '指摘',
  location: '場所',
  severity: '重要度',
  evidence: '変更前 / 変更後',
  suppressed: '解除',
  reason: '理由',
  run: '実行',
  result: '結果',
  details: '実行ログ',
  when: '日時',
  goal: '目的',
  unspecified: '（未指定）',
  changedFiles: '変更したファイル',
  file: 'ファイル',
  status: '状態',
  verified: '実際に確認したこと',
  review: '人が確認すべき指摘',
  open: '未確認・未解決の事項',
  next: '次の担当者（AI）への指示',
  inferred: '関連するテストの変更が見つかりません（推定）',
  instructions: [
    '上の指摘を修正するか、意図した変更の理由をコメントで説明してください。',
    '作業後に npx --no-install didit --run "<テストコマンド>" を実行してください。',
    'テストのスキップ・削除や判定条件の緩和、型・Lint エラーの抑制で問題を回避しないでください。',
  ],
  invalidOutput:
    '引き継ぎ資料の目的ファイル・出力先にシンボリックリンクは使用できません',
};
export function reportMessages(lang: Language) {
  return lang === 'ja' ? ja : en;
}
