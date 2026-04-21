import { execFile as execFileCb } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFileCb)

export type OpenResult = { ok: boolean; message: string }

/**
 * Open `path` in a new window of the user's current terminal (macOS only).
 *
 * Detection strategy: trust `$TERM_PROGRAM` to pick a known AppleScript
 * recipe (Terminal.app, Ghostty). For anything else — or when the env
 * var is missing — fall back to `open -a Terminal`, which is guaranteed
 * to exist on macOS. AppleScript is used for the known apps because
 * `open -a` reuses an existing window instead of reliably creating a
 * new one.
 */
export async function openPathInNewTerminal(path: string): Promise<OpenResult> {
  if (process.platform !== 'darwin') {
    return { ok: false, message: 'Opening a new terminal is only supported on macOS' }
  }

  const termProgram = process.env.TERM_PROGRAM ?? ''

  try {
    // Terminal.app runs our `cd` line through a shell, so the path
    // needs shell-level quoting.
    if (termProgram === 'Apple_Terminal') {
      const quoted = shellSingleQuote(path)
      await runOsascript([
        `tell application "Terminal"`,
        `  do script "cd ${quoted}"`,
        `  activate`,
        `end tell`,
      ])
      return { ok: true, message: '' }
    }
    if (termProgram === 'ghostty') {
      // Ghostty exposes a `new window` AppleScript command whose
      // `configuration` record accepts an `initial working directory`.
      // This is the officially supported way to open a new window in a
      // running Ghostty instance on macOS. Requires the user's config to
      // allow AppleScript (`macos-applescript = ask|allow`); otherwise
      // osascript returns an error which we surface via the notification.
      //
      // The path is embedded as an AppleScript string literal (double
      // quotes), so we escape `\` and `"` for that context — NOT shell
      // quoting, because AppleScript passes it to the app directly.
      const asString = appleScriptString(path)
      await runOsascript([
        `tell application "Ghostty"`,
        `  activate`,
        `  new window with configuration {initial working directory:${asString}}`,
        `end tell`,
      ])
      return { ok: true, message: '' }
    }

    // Fallback: macOS `open` launches Terminal.app with the directory as cwd.
    await execFileAsync('open', ['-a', 'Terminal', path])
    return { ok: true, message: '' }
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string }
    const stderr = typeof e.stderr === 'string' ? e.stderr.trim() : ''
    return { ok: false, message: stderr || e.message || 'Unknown error' }
  }
}

function runOsascript(lines: string[]): Promise<void> {
  const args: string[] = []
  for (const line of lines) args.push('-e', line)
  return execFileAsync('osascript', args).then(() => undefined)
}

// POSIX single-quoting: wrap in '…' and rewrite embedded `'` as `'\''`.
// Safe to embed in a double-quoted AppleScript string because the result
// contains no `"` or `\` characters unless the original path did — and
// worktree paths on macOS can't legally contain those in practice.
function shellSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

// AppleScript string literal: wrap in double quotes and escape `\` and `"`.
function appleScriptString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}
