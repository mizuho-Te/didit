import type { Language } from '../rules/types.js';

const en = {
  initialized: 'didit integration initialized',
  invalidTarget: 'Unknown integration target',
  invalidSettings:
    'Invalid Claude settings; existing settings were not changed',
  invalidMarkers:
    'Unmatched or nested didit markers; existing instructions were not changed',
  unsafePath: 'Integration paths must not contain symbolic links',
  invalidInput: 'Invalid Claude hook JSON input',
  inputTooLarge: 'Claude hook input exceeds the 1 MiB limit',
  hookError: 'didit hook error',
  findings: 'didit found weakened verification',
  repair:
    'Fix these findings without skipping, deleting, or weakening tests. Explain intentional changes with didit-ok: <reason>.',
  omitted: (count: number) => `${String(count)} additional findings omitted.`,
  instructions:
    'After finishing a task, run `npx --no-install didit --run "<test command>"`. Fix every high/medium finding properly. Do not skip, delete, or weaken tests, and do not suppress type or lint errors to make checks pass. If a finding is intentional, add `didit-ok: <reason>` and mention it in your final message.',
};
const ja: typeof en = {
  initialized: 'didit の連携設定を初期化しました',
  invalidTarget: '不明な連携先です',
  invalidSettings: 'Claude の設定が不正です。既存の設定は変更していません',
  invalidMarkers:
    'didit マーカーの対応が不正か、入れ子になっています。既存の指示文は変更していません',
  unsafePath: '連携先のパスにシンボリックリンクは使用できません',
  invalidInput: 'Claude フックの JSON 入力が不正です',
  inputTooLarge: 'Claude フックの入力が 1 MiB の上限を超えています',
  hookError: 'didit フックエラー',
  findings: 'didit が検証の弱体化を検出しました',
  repair:
    'テストをスキップ・削除・弱体化せずに指摘を修正してください。意図した変更には didit-ok: <理由> を記載してください。',
  omitted: (count) => `ほか ${String(count)} 件の指摘を省略しました。`,
  instructions:
    '作業が終わったら `npx --no-install didit --run "<テストコマンド>"` を実行してください。high/medium の指摘をすべて適切に修正してください。テストをスキップ・削除・弱体化したり、型や Lint のエラーを抑制したりして検査を通さないでください。意図した変更には `didit-ok: <理由>` を追加し、最終報告にも記載してください。',
};
export function integrationMessages(lang: Language) {
  return lang === 'ja' ? ja : en;
}
