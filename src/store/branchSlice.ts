import type { StateCreator } from 'zustand'
import { debounce } from 'lodash-es'
import type { BranchInfo, LogEntry, StatusEntry, WorktreeInfo } from '@/git/types.ts'
import { getLog } from '@/git/branches.ts'
import { getWorkingStatus } from '@/git/status.ts'
import type { AppState } from './useAppStore.ts'
import { clamp } from './helpers.ts'

export interface BranchSlice {
  branches: BranchInfo[]
  selectedBranchIndex: number
  currentBranch: string
  repoName: string
  statusCount: number
  worktrees: WorktreeInfo[]
  logEntries: LogEntry[]
  /** Signature ("branch@hash") that `logEntries` was loaded for, or null. */
  logEntriesFor: string | null
  /** Working-tree status for the branch named in `statusEntriesFor` (if any). */
  statusEntries: StatusEntry[]
  /** Branch name that `statusEntries` was last loaded for, or null if unloaded. */
  statusEntriesFor: string | null
  /** True while a status fetch is in flight for the current selection. */
  statusLoading: boolean

  showLog: boolean
  showStatus: boolean

  selectBranch: (index: number) => void
  moveBranchSelection: (delta: number) => void
  toggleShowLog: () => void
  toggleShowStatus: () => void

  refreshLogForSelection: () => Promise<void>
  refreshStatusForSelection: () => Promise<void>
}

export const createBranchSlice: StateCreator<AppState, [], [], BranchSlice> = (set, get) => {
  // Debounced light refresh: only re-fetches the commit log for the newly
  // selected branch. Moving the cursor should NOT trigger `git fetch` — that
  // only happens on the periodic cron or explicit user action.
  const debouncedRefreshLog = debounce(() => get().refreshLogForSelection(), 150)
  const debouncedRefreshStatus = debounce(() => get().refreshStatusForSelection(), 150)

  return {
    branches: [],
    selectedBranchIndex: 0,
    currentBranch: '',
    repoName: '',
    statusCount: 0,
    worktrees: [],
    logEntries: [],
    logEntriesFor: null,
    statusEntries: [],
    statusEntriesFor: null,
    statusLoading: false,
    showLog: false,
    showStatus: false,

    selectBranch(index) {
      const { branches } = get()
      const clamped = clamp(index, 0, Math.max(0, branches.length - 1))
      // Clear logEntriesFor too so the post-debounce refresh actually
      // fetches, even if the user bounced back to a previously-cached
      // selection within the 150ms window.
      set({ selectedBranchIndex: clamped, logEntries: [], logEntriesFor: null })
      debouncedRefreshLog()
      if (get().showStatus) debouncedRefreshStatus()
    },

    moveBranchSelection(delta) {
      const { branches, selectedBranchIndex } = get()
      if (branches.length === 0) return
      const next = clamp(selectedBranchIndex + delta, 0, branches.length - 1)
      set({ selectedBranchIndex: next, logEntries: [], logEntriesFor: null })
      debouncedRefreshLog()
      if (get().showStatus) debouncedRefreshStatus()
    },

    toggleShowLog() {
      const next = !get().showLog
      // log and status share the detail expansion area — keep them mutually exclusive
      set({ showLog: next, showStatus: next ? false : get().showStatus })
    },

    toggleShowStatus() {
      const next = !get().showStatus
      set({ showStatus: next, showLog: next ? false : get().showLog })
      if (next) get().refreshStatusForSelection()
    },

    async refreshLogForSelection() {
      const { branches, selectedBranchIndex, logEntriesFor } = get()
      const target = branches[selectedBranchIndex]
      if (!target) {
        set({ logEntries: [], logEntriesFor: null })
        return
      }
      // Skip the fetch when the currently cached log already matches this
      // branch at this commit — the common case during cron ticks where the
      // selected branch's HEAD didn't change.
      const signature = `${target.name}@${target.lastCommitHash}`
      if (logEntriesFor === signature) return

      const logEntries = await getLog(target.name, 5)
      // Only apply if the selection hasn't moved while we were fetching.
      const { branches: nowBranches, selectedBranchIndex: nowIdx } = get()
      if (nowBranches[nowIdx]?.name === target.name) {
        set({ logEntries, logEntriesFor: signature })
      }
    },

    async refreshStatusForSelection() {
      const { branches, selectedBranchIndex, currentBranch } = get()
      const target = branches[selectedBranchIndex]
      if (!target) {
        set({ statusEntries: [], statusEntriesFor: null, statusLoading: false })
        return
      }
      const isCurrentTarget = target.name === currentBranch
      const cwd = isCurrentTarget ? undefined : target.worktreePath ? target.worktreePath : null
      if (cwd === null) {
        // Not checked out anywhere — the status panel short-circuits to
        // "not checked out" based on the branch alone, so there's nothing
        // to load; just make sure the spinner isn't stuck.
        set({ statusLoading: false })
        return
      }
      set({ statusLoading: true })
      const statusEntries = await getWorkingStatus(cwd)
      // Discard if selection moved during the await. Check both the selected
      // branch name *and* — for the current-branch path — that currentBranch
      // is still this one (a checkout during the await would make the status
      // belong to a different branch than `target.name` suggests).
      const {
        branches: nowBranches,
        selectedBranchIndex: nowIdx,
        currentBranch: nowCurrent,
      } = get()
      const stillSelected = nowBranches[nowIdx]?.name === target.name
      const currentStillMatches = !isCurrentTarget || nowCurrent === currentBranch
      if (stillSelected && currentStillMatches) {
        set({ statusEntries, statusEntriesFor: target.name, statusLoading: false })
      } else {
        // Result is stale (selection moved, or external `git checkout` during
        // the await changed currentBranch). Still clear `statusLoading` so
        // the UI doesn't get stuck on "loading…" — if a newer refresh is
        // already in flight it will set loading back to true.
        set({ statusLoading: false })
      }
    },
  }
}
