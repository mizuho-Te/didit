import { gitErrors } from '../i18n/git-errors.js';
import { execFile } from 'node:child_process';

export class GitError extends Error {
  constructor(
    public readonly exitCode: number | null,
    public readonly stderr: string,
    public readonly args: readonly string[],
  ) {
    super(stderr.trim() || gitErrors.failed(exitCode));
    this.name = 'GitError';
  }
}

function executeGitBuffer(
  cwd: string,
  args: readonly string[],
  diagnosticArgs: readonly string[] = args,
  input?: Buffer,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      [
        '--no-pager',
        '-c',
        'core.fsmonitor=false',
        '-c',
        'core.hooksPath=',
        ...args,
      ],
      {
        cwd,
        shell: false,
        encoding: 'buffer',
        maxBuffer: 128 * 1024 * 1024,
        env: {
          ...process.env,
          GIT_OPTIONAL_LOCKS: '0',
          GIT_TERMINAL_PROMPT: '0',
          GIT_LITERAL_PATHSPECS: '1',
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new GitError(
              typeof error.code === 'number' ? error.code : null,
              stderr.toString('utf8') || error.message,
              diagnosticArgs,
            ),
          );
        } else resolve(stdout);
      },
    );
    if (input && child.stdin) {
      child.stdin.on('error', (error: Error) => {
        reject(new GitError(null, error.message, diagnosticArgs));
      });
      child.stdin.end(input);
    }
  });
}

/** Working-tree comparisons must not invoke repository-configured conversion programs. */
export async function gitBuffer(
  cwd: string,
  args: readonly string[],
): Promise<Buffer> {
  if (args[0] !== 'diff' && args[0] !== 'status')
    return executeGitBuffer(cwd, args);
  let names: Buffer;
  try {
    names = await executeGitBuffer(cwd, [
      'config',
      '--null',
      '--name-only',
      '--get-regexp',
      '^filter\\..*\\.(clean|process|required)$',
    ]);
  } catch (error: unknown) {
    if (!(error instanceof GitError) || error.exitCode !== 1) throw error;
    names = Buffer.alloc(0);
  }
  const overrides = names
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .flatMap((name) => [
      '-c',
      `${name}=${name.endsWith('.required') ? 'false' : ''}`,
    ]);
  return executeGitBuffer(cwd, [...overrides, ...args], args);
}

export async function git(
  cwd: string,
  args: readonly string[],
): Promise<string> {
  return (await gitBuffer(cwd, args)).toString('utf8');
}

/** Send only generated object IDs to Git's line-oriented batch protocol. */
export function gitInputBuffer(
  cwd: string,
  args: readonly string[],
  input: Buffer,
): Promise<Buffer> {
  return executeGitBuffer(cwd, args, args, input);
}
