import { execFile as execFileCb } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFileCb)

export type ExecResult = { ok: boolean; message: string }

export async function git(args: string[], options?: { cwd?: string }): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    encoding: 'utf-8',
    cwd: options?.cwd ?? process.cwd(),
  })
  return stdout.trimEnd()
}

export async function gitResult(...args: string[]): Promise<ExecResult> {
  return gitResultIn(undefined, ...args)
}

export async function gitResultIn(cwd: string | undefined, ...args: string[]): Promise<ExecResult> {
  try {
    const output = await git(args, { cwd })
    return { ok: true, message: output }
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string }
    const stderr = typeof e.stderr === 'string' ? e.stderr : ''
    const message = stripNoise(stderr).trim() || e.message || 'Unknown error'
    return { ok: false, message }
  }
}

/**
 * Drop lines that are transport-level noise rather than the actual git error.
 * SSH in particular likes to print informational warnings to stderr (e.g. the
 * macOS post-quantum KEX notice) that get concatenated with the real message,
 * pushing the useful text out of our single-line notification. We skip lines
 * starting with `**`, `WARNING:`, or `Warning:` so the true error surfaces.
 */
function stripNoise(stderr: string): string {
  return stderr
    .split('\n')
    .filter((line) => {
      const trimmed = line.trimStart()
      if (!trimmed) return false
      if (trimmed.startsWith('**')) return false
      if (/^warning:/i.test(trimmed)) return false
      return true
    })
    .join('\n')
}
