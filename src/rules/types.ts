export type Language = 'en' | 'ja';
export type FileLanguage =
  'ts' | 'js' | 'py' | 'json' | 'yaml' | 'toml' | 'other';
export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';
export type Severity = 'high' | 'medium' | 'low';
export type FailOn = Severity | 'none';
export type Category =
  | 'test-disabled'
  | 'test-removed'
  | 'assertion-weakened'
  | 'expected-changed'
  | 'suppression'
  | 'config-weakened'
  | 'ci-weakened'
  | 'error-swallowed'
  | 'test-env-branch'
  | 'didit-config'
  | 'run';
export interface DiffLine {
  type: 'add' | 'del' | 'ctx';
  content: string;
  oldLine?: number;
  newLine?: number;
}
export interface Hunk {
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}
export interface FileDiff {
  path: string;
  oldPath?: string;
  status: FileStatus;
  hunks: Hunk[];
  isBinary: boolean;
  /** Metadata retained for mandatory configuration-change reporting; contents were skipped. */
  contentOmitted?: boolean;
  language: FileLanguage;
  isTestFile: boolean;
}
export interface Finding {
  ruleId: string;
  severity: Severity;
  category: Category;
  file?: string;
  line?: number;
  side: 'added' | 'removed' | 'file' | 'run';
  message: string;
  before?: string;
  after?: string;
  suppressed?: { reason: string; source: 'comment' | 'config' };
}
export type RuleFinding = Omit<Finding, 'severity'> & { severity?: Severity };
export interface RuleContext {
  file: FileDiff;
  getBaseContent(): Promise<string | null>;
  getCurrentContent(): Promise<string | null>;
  lang: Language;
}
export interface Rule {
  id: string;
  defaultSeverity: Severity;
  category: Category;
  appliesTo(file: FileDiff): boolean;
  check(ctx: RuleContext): Promise<RuleFinding[]>;
  meta: { description: Record<Language, string>; docsAnchor: string };
}
export interface RunResult {
  side: 'base' | 'current';
  command: string;
  sha: string;
  dirty: boolean;
  startedAt: string;
  durationMs: number;
  exitCode: number | null;
  timedOut: boolean;
  parser: 'junit' | 'vitest' | 'jest' | 'pytest' | 'none';
  counts?: { passed: number; failed: number; skipped: number; total: number };
  logTail: string;
}
export interface Report {
  schemaVersion: 1;
  tool: { name: 'didit'; version: string };
  generatedAt: string;
  lang: Language;
  range: {
    mode: 'worktree' | 'staged' | 'commit';
    base: { ref: string; sha: string };
    current: { ref: string; sha: string; dirty: boolean };
  };
  summary: {
    filesChanged: number;
    filesSkipped: number;
    high: number;
    medium: number;
    low: number;
    suppressed: number;
    failOn: FailOn;
    failed: boolean;
  };
  findings: Finding[];
  suppressionsAdded: {
    file: string;
    line: number;
    ruleId?: string;
    reason: string;
  }[];
  runs?: { base?: RunResult; current: RunResult };
}
