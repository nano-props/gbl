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
  try {
    const output = await git(args)
    return { ok: true, message: output }
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string }
    const message = (typeof e.stderr === 'string' ? e.stderr.trim() : '') || e.message || 'Unknown error'
    return { ok: false, message }
  }
}
