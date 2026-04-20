import type { StateCreator } from 'zustand'
import { checkoutBranch } from '@/git/branches.ts'
import { fetchAll, pullBranch, pushBranch } from '@/git/remote.ts'
import { tildifyHome } from '@/utils/path.ts'
import type { AppState } from './useAppStore.ts'
import { runAction } from './helpers.ts'

export interface BranchActionsSlice {
  doPull: (branch: string, worktreePath?: string) => Promise<void>
  doPush: (branch: string) => Promise<void>
  doCheckout: (name: string) => Promise<void>
  doFetchAll: () => Promise<void>
}

export const createBranchActionsSlice: StateCreator<AppState, [], [], BranchActionsSlice> = (set, get) => ({
  async doPull(branch, worktreePath) {
    const isCurrent = branch === get().currentBranch
    if (!isCurrent) {
      const b = get().branches.find((b) => b.name === branch)
      if (!b?.tracking) {
        get().showNotification('error', `Branch "${branch}" has no remote tracking branch`)
        return
      }
      if (b.trackingGone) {
        get().showNotification('error', `Remote branch "${b.tracking}" is gone`)
        return
      }
    }

    const busyMsg =
      worktreePath && !isCurrent
        ? `Pulling "${branch}" in ${tildifyHome(worktreePath)}...`
        : `Pulling "${branch}"...`
    await runAction(
      async () => {
        const res = await pullBranch(branch, worktreePath)
        // A successful pull implies a successful fetch, so refresh the
        // header's "fetched Xs ago" indicator too — otherwise it would
        // still show the pre-pull time even though we just synced.
        if (res.ok) set({ lastFetchedAt: Date.now() })
        return res
      },
      `Pulled "${branch}"`,
      'Pull failed',
      { busyMsg },
    )
  },

  async doPush(branch) {
    await runAction(() => pushBranch(branch), `Pushed "${branch}"`, 'Push failed', {
      busyMsg: `Pushing "${branch}"...`,
      fetch: true,
    })
  },

  async doCheckout(name) {
    await runAction(() => checkoutBranch(name), `Checked out "${name}"`, 'Checkout failed', {
      busyMsg: `Checking out "${name}"...`,
    })
  },

  async doFetchAll() {
    await runAction(
      async () => {
        const res = await fetchAll()
        if (res.ok) set({ lastFetchedAt: Date.now() })
        return res
      },
      'Fetched all remotes',
      'Fetch failed',
      { busyMsg: 'Fetching all remotes...' },
    )
  },
})
