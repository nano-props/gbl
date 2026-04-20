import { create } from 'zustand'
import { getBranches, getRepoName, getStatus } from '@/git/branches.ts'
import { fetchAll } from '@/git/remote.ts'
import { getWorktrees } from '@/git/worktrees.ts'
import { clamp } from './helpers.ts'
import { createBranchSlice, type BranchSlice } from './branchSlice.ts'
import { createBranchActionsSlice, type BranchActionsSlice } from './branchActions.ts'
import { createUISlice, type UISlice } from './uiSlice.ts'

export type AppState = UISlice &
  BranchSlice &
  BranchActionsSlice & {
    refreshAll: (opts?: { fetch?: boolean }) => Promise<void>
  }

export const useAppStore = create<AppState>()((...a) => {
  const [set, get] = a

  // Monotonic counter so a stale refresh doesn't clobber a newer one's state.
  // Cron + user actions can trigger refreshAll concurrently; only the latest
  // one should win.
  let refreshId = 0

  return {
    ...createUISlice(...a),
    ...createBranchSlice(...a),
    ...createBranchActionsSlice(...a),

    async refreshAll(opts) {
      const myId = ++refreshId
      // Track whether *this* call owns the busy message, so the final set()
      // doesn't clobber a concurrent action's spinner.
      let ownsBusy = false
      if (opts?.fetch) {
        set({ busyMessage: 'Fetching remotes...' })
        ownsBusy = true
        try {
          const res = await fetchAll()
          // Only mark the freshness indicator when the fetch actually
          // succeeded; `fetchAll` returns `{ok:false}` on network/SSH
          // failures without throwing, so we must inspect the result.
          if (res.ok) set({ lastFetchedAt: Date.now() })
        } catch {
          /* ignore fetch errors */
        }
      }
      if (myId !== refreshId) return // superseded

      const [worktrees, statusCount] = await Promise.all([getWorktrees(), getStatus()])
      if (myId !== refreshId) return
      const branches = await getBranches(worktrees)
      if (myId !== refreshId) return
      const currentBranch = branches.find((b) => b.isCurrent)?.name ?? ''

      // repoName is stable within a session; fetch once
      let repoName = get().repoName
      if (!repoName) repoName = await getRepoName()
      if (myId !== refreshId) return

      // Resolve selected branch index just before the set() — reading the
      // latest selectedBranchIndex from the store, not the snapshot we took
      // at the top. Otherwise a user key press during the await (e.g. ↓
      // while cron's fetchAll was running) would be overwritten below.
      const currentBranches = get().branches
      const currentIdx = get().selectedBranchIndex
      const currentSelectedName = currentBranches[currentIdx]?.name
      let selectedBranchIndex: number
      if (currentBranches.length === 0) {
        const initIdx = branches.findIndex((b) => b.isCurrent)
        selectedBranchIndex = initIdx >= 0 ? initIdx : 0
      } else {
        const foundIdx = currentSelectedName ? branches.findIndex((b) => b.name === currentSelectedName) : -1
        selectedBranchIndex = foundIdx >= 0 ? foundIdx : clamp(currentIdx, 0, Math.max(0, branches.length - 1))
      }

      set({
        worktrees,
        statusCount,
        branches,
        currentBranch,
        repoName,
        isLoaded: true,
        selectedBranchIndex,
      })
      // Only clear busyMessage if it's still the one *this* call set.
      if (ownsBusy && get().busyMessage === 'Fetching remotes...') {
        set({ busyMessage: null })
      }

      // Refresh the log for whatever's currently selected. Doing it after
      // set() — and without writing logEntries directly in the set above —
      // means a user key press during the await can't get its log result
      // clobbered by a stale one from the refreshAll snapshot. The normal
      // debounced refresh path also runs on selection change, so this is
      // guaranteed to converge on the right branch.
      get()
        .refreshLogForSelection()
        .catch(() => {})

      // If the status panel is open, refresh the working status for the
      // currently selected branch too — otherwise the file list can go stale
      // between user-triggered refreshes (cron tick, post-pull/push refresh).
      if (get().showStatus) {
        get()
          .refreshStatusForSelection()
          .catch(() => {})
      }
    },
  }
})
