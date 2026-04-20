import { git, gitResult } from './helper.ts'
import type { ExecResult } from './helper.ts'
import type { BranchInfo, LogEntry, WorktreeInfo } from './types.ts'

export async function isGitRepo(): Promise<boolean> {
  try {
    await git(['rev-parse', '--is-inside-work-tree'])
    return true
  } catch {
    return false
  }
}

export async function getRepoName(): Promise<string> {
  try {
    const root = await git(['rev-parse', '--show-toplevel'])
    if (!root) return ''
    const idx = root.lastIndexOf('/')
    return idx >= 0 ? root.slice(idx + 1) : root
  } catch {
    return ''
  }
}

export async function getCurrentBranch(): Promise<string> {
  // `symbolic-ref` fails on a detached HEAD, which is exactly what we want:
  // `rev-parse --abbrev-ref HEAD` would return the literal string "HEAD"
  // there, which then gets displayed as if it were a branch name.
  try {
    return await git(['symbolic-ref', '--short', 'HEAD'])
  } catch {
    return ''
  }
}

export async function getBranches(worktrees?: WorktreeInfo[]): Promise<BranchInfo[]> {
  try {
    // ASCII Unit Separator (0x1f): never appears in normal text, so it's safe
    // against commit subjects or author names that contain our delimiter.
    const SEP = '\x1f'
    const format = [
      '%(refname:short)',
      '%(objectname:short)',
      '%(subject)',
      '%(authordate:relative)',
      '%(authorname)',
      '%(upstream:short)',
      '%(upstream:track)',
    ].join(SEP)

    const output = await git(['for-each-ref', `--format=${format}`, 'refs/heads/'])

    if (!output) return []

    const currentBranch = await getCurrentBranch()

    const worktreeMap = new Map<string, { path: string; isDirty?: boolean }>()
    for (const wt of worktrees ?? []) {
      if (wt.branch) {
        worktreeMap.set(wt.branch, { path: wt.path, isDirty: wt.isDirty })
      }
    }

    const lines = output.split('\n').filter(Boolean)
    const branches: BranchInfo[] = []

    for (const line of lines) {
      const parts = line.split(SEP)
      const name = parts[0] ?? ''
      const hash = parts[1] ?? ''
      const subject = parts[2] ?? ''
      const date = parts[3] ?? ''
      const author = parts[4] ?? ''
      const upstream = parts[5] ?? ''
      const track = parts[6] ?? ''

      let ahead = 0
      let behind = 0
      const aheadMatch = track.match(/ahead (\d+)/)
      const behindMatch = track.match(/behind (\d+)/)
      if (aheadMatch) ahead = parseInt(aheadMatch[1], 10)
      if (behindMatch) behind = parseInt(behindMatch[1], 10)

      const branchInfo: BranchInfo = {
        name,
        isCurrent: name === currentBranch,
        ahead,
        behind,
        lastCommitHash: hash,
        lastCommitMessage: subject,
        lastCommitDate: date,
        lastCommitAuthor: author,
      }

      if (upstream) {
        branchInfo.tracking = upstream
        branchInfo.trackingGone = track.includes('gone')
      }

      const wtInfo = worktreeMap.get(name)
      if (wtInfo) {
        branchInfo.worktreePath = wtInfo.path
        branchInfo.worktreeDirty = wtInfo.isDirty
      }

      branches.push(branchInfo)
    }

    return branches
  } catch {
    return []
  }
}

export async function getStatus(): Promise<number> {
  try {
    const output = await git(['status', '--porcelain'])
    if (!output) return 0
    return output.split('\n').filter(Boolean).length
  } catch {
    return 0
  }
}

export async function getLog(branch: string, count: number = 10): Promise<LogEntry[]> {
  try {
    // `git log` format honours `%x1f` as the Unit Separator byte, which is safe
    // against subjects/author names that contain our delimiter verbatim.
    const SEP = '\x1f'
    const format = [`%H`, `%h`, `%s`, `%an`, `%ar`].join('%x1f')
    const output = await git(['log', `--format=${format}`, '-n', String(count), branch])
    if (!output) return []

    return output
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(SEP)
        return {
          hash: parts[0] ?? '',
          shortHash: parts[1] ?? '',
          message: parts[2] ?? '',
          author: parts[3] ?? '',
          date: parts[4] ?? '',
        }
      })
  } catch {
    return []
  }
}

export async function checkoutBranch(name: string): Promise<ExecResult> {
  return gitResult('checkout', name)
}
