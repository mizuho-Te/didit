import { createRule, finding } from './lib/create.js';
import { addedLines, isCode } from './lib/patterns.js';
export default createRule(
  'test-env-branch-added',
  'high',
  'test-env-branch',
  (file) =>
    isCode(file) &&
    !file.isTestFile &&
    !/(?:^|\/)(?:[^/]+\.config\.[^/]+|(?:vitest|jest)\.setup\.[^/]+|conftest\.py)$/.test(
      file.path,
    ),
  (ctx) =>
    addedLines(ctx.file)
      .filter((line) =>
        ctx.file.language === 'py'
          ? /PYTEST_CURRENT_TEST|['"]pytest['"]\s+in\s+sys\.modules/.test(
              line.content,
            )
          : /process\.env\.(?:NODE_ENV\s*===?\s*['"]test['"]|VITEST\b|JEST_WORKER_ID\b)|import\.meta\.env\.(?:MODE\s*===?\s*['"]test['"]|VITEST\b)/.test(
              line.content,
            ),
      )
      .map((line) =>
        finding('test-env-branch-added', 'test-env-branch', ctx, line),
      ),
);
