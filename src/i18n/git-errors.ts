/** Git diagnostics have no language context; the CLI supplies a localized error label. */
export const gitErrors = {
  failed: (code: number | null): string =>
    `Git failed with exit code ${String(code)}`,
  conflictingModes: '--staged and --head cannot be combined',
  malformedStatus: 'Malformed Git name-status output',
  missingRename: 'Missing renamed Git path',
  mismatchedFiles: 'Git patch and file lists do not match',
};
