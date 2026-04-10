import { git, gitResult } from './helper.ts'
import type { ExecResult } from './helper.ts'
import type { WorktreeInfo } from './types.ts'

export async function getWorktrees(): Promise<WorktreeInfo[]> {
  try {
    const output = await git(['worktree', 'list', '--porcelain'])
    if (!output) return []

    const worktrees: WorktreeInfo[] = []
    const blocks = output.split('\n\n').filter(Boolean)

    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean)
      let path = ''
      let head = ''
      let branch: string | undefined
      let isBare = false
      let isLocked = false

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          path = line.slice('worktree '.length)
        } else if (line.startsWith('HEAD ')) {
          head = line.slice('HEAD '.length)
        } else if (line.startsWith('branch ')) {
          const ref = line.slice('branch '.length)
          branch = ref.replace(/^refs\/heads\//, '')
        } else if (line === 'bare') {
          isBare = true
        } else if (line === 'locked' || line.startsWith('locked ')) {
          isLocked = true
        }
      }

      if (path) {
        worktrees.push({
          path,
          head,
          branch,
          isMainWorktree: worktrees.length === 0,
          isBare,
          isLocked,
        })
      }
    }

    // Fetch dirty status for each non-bare worktree
    await Promise.all(
      worktrees.map(async (wt) => {
        if (wt.isBare) return
        try {
          const out = await git(['status', '--porcelain'], { cwd: wt.path })
          wt.isDirty = out.length > 0
          if (wt.isDirty) {
            wt.statusFiles = out
              .split('\n')
              .filter(Boolean)
              .map((line) => ({
                x: line[0] ?? ' ',
                y: line[1] ?? ' ',
                path: line.slice(3),
              }))
          }
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

export async function addWorktree(
  path: string,
  branch: string,
  options?: { createBranch?: boolean; startPoint?: string },
): Promise<ExecResult> {
  if (options?.createBranch) {
    if (options.startPoint) {
      return gitResult('worktree', 'add', '-b', branch, path, options.startPoint)
    }
    return gitResult('worktree', 'add', '-b', branch, path)
  }
  return gitResult('worktree', 'add', path, branch)
}

export async function removeWorktree(path: string, force?: boolean): Promise<ExecResult> {
  if (force) {
    return gitResult('worktree', 'remove', '--force', path)
  }
  return gitResult('worktree', 'remove', path)
}

export async function moveWorktree(oldPath: string, newPath: string): Promise<ExecResult> {
  return gitResult('worktree', 'move', oldPath, newPath)
}

export async function pruneWorktrees(): Promise<ExecResult> {
  return gitResult('worktree', 'prune')
}
