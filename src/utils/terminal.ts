import { execFile as execFileCb } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFileCb)

export type OpenResult = { ok: boolean; message: string }
export type OpenMode = 'tab' | 'window'

/**
 * Open `path` in the user's current terminal (macOS only).
 *
 * `mode` picks between a new tab and a new window. Only Ghostty honors
 * `tab` today — Terminal.app's `do script` always spawns a new window,
 * and the generic `open -a` fallback can't target tabs reliably.
 *
 * Detection strategy: trust `$TERM_PROGRAM` to pick a known AppleScript
 * recipe (Terminal.app, Ghostty). For anything else — or when the env
 * var is missing — fall back to `open -a Terminal`, which is guaranteed
 * to exist on macOS.
 */
export async function openPathInNewTerminal(
  path: string,
  mode: OpenMode = 'tab',
): Promise<OpenResult> {
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
      // Ghostty exposes `new tab` and `new window` AppleScript commands,
      // both of which accept a `configuration` record with an
      // `initial working directory`. Requires the user's config to allow
      // AppleScript (`macos-applescript = ask|allow`); otherwise
      // osascript returns an error which we surface via the notification.
      //
      // `new tab` needs an existing Ghostty window to attach to — if
      // none is open Ghostty raises "Failed to create tab." and we
      // fall back to `new window`. Other errors (permission denied,
      // etc.) are propagated as-is.
      //
      // The path is embedded as an AppleScript string literal (double
      // quotes), so we escape `\` and `"` for that context — NOT shell
      // quoting, because AppleScript passes it to the app directly.
      const asString = appleScriptString(path)
      if (mode === 'tab') {
        try {
          await runOsascript([
            `tell application "Ghostty"`,
            `  activate`,
            `  new tab with configuration {initial working directory:${asString}}`,
            `end tell`,
          ])
          return { ok: true, message: '' }
        } catch (err: unknown) {
          if (!isNoParentWindowError(err)) throw err
          // No existing Ghostty window — fall through to `new window`.
        }
      }
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

// Ghostty's `new tab` handler raises this exact string when no parent
// window is available to host the new tab. Matching on the message is
// the only signal we get from osascript — the AppleScript error number
// (-10000 / errAEEventFailed) is shared with unrelated failures.
function isNoParentWindowError(err: unknown): boolean {
  const e = err as { stderr?: string; message?: string }
  const text = `${e.stderr ?? ''} ${e.message ?? ''}`
  return text.includes('Failed to create tab.')
}
