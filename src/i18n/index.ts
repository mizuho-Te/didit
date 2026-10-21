import type { Language } from '../rules/types.js';
import { uiEn } from './en.js';
import { uiJa } from './ja.js';

export function resolveLanguage(
  cli?: string,
  config?: Language,
  env: NodeJS.ProcessEnv = process.env,
): Language {
  const selected = cli ?? env.DIDIT_LANG ?? config;
  if (selected === 'en' || selected === 'ja') return selected;
  return (env.LC_ALL || env.LANG || '').startsWith('ja') ? 'ja' : 'en';
}
export function messages(lang: Language): { [K in keyof typeof uiEn]: string } {
  return lang === 'ja' ? uiJa : uiEn;
}
