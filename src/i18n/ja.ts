import type { ruleMessages as en } from './en.js';
export const ruleMessages = {
  'py-test-skip-added':
    'テストがスキップ、または失敗を許容する設定になりました',
  'py-suppress-added': '型・Lint のエラー抑制が追加されました',
  'tsconfig-loosened': 'TypeScript の検査が緩くなりました：{option}',
  'test-script-weakened': 'テストの実行方法が弱められました',
  'coverage-threshold-lowered':
    'カバレッジの基準が下がりました（{key}: {before} → {after}）',
  'ci-weakened': 'CI の検査が弱められた、または削除されました',
  'test-env-branch-added': 'テスト実行時だけ動作が変わるコードが追加されました',
  'didit-config-changed': 'didit の設定が変更されました：{detail}',

  'test-skip-added': 'テストがスキップされました',
  'test-only-added': '.only により他のテストが実行されなくなります',
  'test-file-deleted': 'テストファイルが削除されました',
  'test-case-removed': 'テストの数が減りました（{before} → {after}）',
  'assertion-count-decreased':
    'アサーションの数が減りました（{before} → {after}）',
  'assertion-weakened': '判定条件が緩くなりました',
  'expected-value-changed':
    '期待値が変更されました。不具合に合わせてテストを書き換えていないか確認してください',
  'snapshot-updated':
    'スナップショットが変更されました（{lines}行）。意図した変更か確認してください',
  'ts-suppress-added': '型エラーの抑制が追加されました',
  'any-added': 'any 型が追加されました',
  'lint-disable-added': 'Lint のルールが無効化されました',
  'empty-catch-added': 'エラーが握りつぶされています',
} as const satisfies Record<keyof typeof en, string>;
export const ruleDescriptions = ruleMessages;

import type { uiEn } from './en.js';

export const uiJa: { [K in keyof typeof uiEn]: string } = {
  invalidHookInput: 'フックの入力には JSON テキストが必要です',
  largeHookInput: 'フックの入力が 1 MiB の上限を超えています',
  help: `didit — Git の変更で弱められた検証を確認
使い方: didit [check] [options]
        didit rules
        didit init [claude|agents|cursor|copilot]
        didit hook claude
        didit --version | --help
オプション:
  --base <ref> --head <ref> --staged
  --run <command> --no-base-run --junit <glob> --timeout <sec>
  --format <text|json|markdown> --fail-on <high|medium|low|none>
  --handoff --goal <text> --out-dir <dir>
  --lang <en|ja> --config <path> --quiet --no-color
終了コード: 0 基準以上の指摘なし / 1 指摘あり / 2 使用方法・実行時エラー
Claude フック: 0 終了可 / 2 修正を要求 / 1 ツールのエラー（停止を妨げない）`,
  error: 'エラー',
  invalidOption: '無効、または未対応のオプション',
  missingValue: 'オプションの値が必要です',
  incompatible: '--staged と --head は同時に指定できません',
  noChanges: '検査する変更はありません',
  baseHint: '比較の基準を変えるには --base main を指定してください。',
  summary: '結果',
  suppressed: '解除',
  changes: '変更ファイル',
  skipped: '対象外ファイル',
  hint: '指摘を確認してください。意図した変更には // didit-ok: 理由 を書いてください。',
  ruleFailure: 'ルールの実行に失敗しました。他のルールの検査は続行しました',
  addedSuppressions: 'この変更で追加された解除',
  tests: 'テスト実行',
  notRun: 'テストは実行していません。',
  passed: '成功',
  failed: '失敗',
  testSkipped: 'スキップ',
};

export const ruleConfigDetails = {
  parseFailure: '変更の詳細を解析できませんでした',
  added: '追加',
  modified: '変更',
  deleted: '削除',
  renamed: '名前の変更',
};
