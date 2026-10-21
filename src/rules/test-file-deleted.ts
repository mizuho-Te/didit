import { createRule, finding } from './lib/create.js';
export default createRule(
  'test-file-deleted',
  'high',
  'test-removed',
  (file) => file.isTestFile,
  (ctx) =>
    ctx.file.status === 'deleted'
      ? [finding('test-file-deleted', 'test-removed', ctx)]
      : [],
);
