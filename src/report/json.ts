import type { Report } from '../rules/types.js';

export function renderJson(report: Report): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
