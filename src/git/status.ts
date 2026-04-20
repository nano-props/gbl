import { git } from './helper.ts'
import type { StatusEntry } from './types.ts'

/**
 * Parsed `git status --porcelain` for the current repo (or a specific worktree
 * when `cwd` is passed). Rename lines ("R  old -> new") are collapsed to the
 * new path — we only need what to display.
 */
export async function getWorkingStatus(cwd?: string): Promise<StatusEntry[]> {
  try {
    const output = await git(['status', '--porcelain'], cwd ? { cwd } : undefined)
    if (!output) return []
    return output
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const x = line[0] ?? ' '
        const y = line[1] ?? ' '
        let path = line.slice(3)
        const arrow = path.indexOf(' -> ')
        if (arrow >= 0) path = path.slice(arrow + 4)
        return { x, y, path }
      })
  } catch {
    return []
  }
}
