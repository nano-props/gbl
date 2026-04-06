export interface BranchInfo {
  name: string
  isCurrent: boolean
  isRemote: boolean
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

export interface StatusEntry {
  x: string
  y: string
  path: string
}

export interface WorktreeInfo {
  path: string
  head: string
  branch?: string
  isMainWorktree: boolean
  isBare: boolean
  isLocked: boolean
  isDirty?: boolean
  statusFiles?: StatusEntry[]
}

export interface StashEntry {
  index: number
  message: string
  subject: string
}

export interface LogEntry {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}
