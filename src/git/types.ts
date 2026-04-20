export interface BranchInfo {
  name: string
  isCurrent: boolean
  tracking?: string
  trackingGone?: boolean
  ahead: number
  behind: number
  lastCommitHash: string
  lastCommitMessage: string
  lastCommitDate: string
  lastCommitAuthor: string
  worktreePath?: string
  worktreeDirty?: boolean
}

export interface WorktreeInfo {
  path: string
  branch?: string
  isBare: boolean
  isDirty?: boolean
  changeCount?: number
}

export interface StatusEntry {
  /** Index (staged) status character. */
  x: string
  /** Working-tree (unstaged) status character. */
  y: string
  /** Path relative to the worktree root. */
  path: string
}

export interface LogEntry {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}
