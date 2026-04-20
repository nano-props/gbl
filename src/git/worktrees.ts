import { git } from './helper.ts'
import type { WorktreeInfo } from './types.ts'

/**
 * Read-only listing of worktrees, used to annotate branches with their
 * worktree path and dirty status. No mutation helpers are exported — the
 * tool is view-only for worktree data.
 */
export async function getWorktrees(): Promise<WorktreeInfo[]> {
  try {
    const output = await git(['worktree', 'list', '--porcelain'])
    if (!output) return []

    const worktrees: WorktreeInfo[] = []
    const blocks = output.split('\n\n').filter(Boolean)

    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean)
      let path = ''
      let branch: string | undefined
      let isBare = false

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          path = line.slice('worktree '.length)
        } else if (line.startsWith('branch ')) {
          const ref = line.slice('branch '.length)
          branch = ref.replace(/^refs\/heads\//, '')
        } else if (line === 'bare') {
          isBare = true
        }
      }

      if (path) {
        worktrees.push({ path, branch, isBare })
      }
    }

    // Fetch dirty status for each non-bare worktree. We need the count so the
    // branch detail can show "● N changes" for non-current branches that have
    // a worktree checked out.
    await Promise.all(
      worktrees.map(async (wt) => {
        if (wt.isBare) return
        try {
          const out = await git(['status', '--porcelain'], { cwd: wt.path })
          const count = out ? out.split('\n').filter(Boolean).length : 0
          wt.isDirty = count > 0
          wt.changeCount = count
        } catch {
          wt.isDirty = undefined
        }
      }),
    )

    return worktrees
  } catch {
    return []
  }
}
