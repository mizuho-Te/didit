import type { Language } from '../rules/types.js';

const en = {
  invalid: 'Invalid configuration',
  unreadable: 'Cannot read configuration',
  syntax: 'Invalid JSONC syntax at line',
  unknownRule: 'Unknown rule',
  protectedRule: 'This rule cannot be disabled',
  missingReason: 'Suppression has no reason',
};
const ja: Record<keyof typeof en, string> = {
  invalid: '設定が不正です',
  unreadable: '設定を読み込めません',
  syntax: 'JSONC の構文が不正です。行',
  unknownRule: '不明なルールです',
  protectedRule: 'このルールは無効化できません',
  missingReason: '解除の理由がありません',
};
export function configMessages(
  lang: Language,
): Record<keyof typeof en, string> {
  return lang === 'ja' ? ja : en;
}
