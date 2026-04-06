import { create } from 'zustand'
import { debounce } from 'lodash-es'
import type {
  BranchInfo,
  StatusEntry,
  WorktreeInfo,
  StashEntry,
  LogEntry,
} from '@/git/index.ts'
import {
  getBranches,
  getStatus,
  getWorktrees,
  getStashes,
  getLog,
  deleteBranch,
  deleteRemoteBranch,
  pullBranch,
  pushBranch,
  checkoutBranch,
  createBranch,
  renameBranch,
  mergeBranch,
  rebaseBranch,
  fetchAll,
  addWorktree,
  removeWorktree,
  moveWorktree,
  pruneWorktrees,
  stashSave,
  stashPop,
  stashDrop,
  cleanRepo,
} from '@/git/index.ts'
import type { ExecResult } from '@/git/index.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  type: 'success' | 'error' | 'info'
  message: string
}

interface ConfirmDialog {
  title: string
  message: string
}

interface InputDialog {
  title: string
  placeholder: string
  allowEmpty?: boolean
  defaultValue?: string
}

type View = 'branches' | 'worktrees' | 'stashes' | 'cleanup' | 'help'

export interface AppState {
  // View management
  currentView: View

  // Branch state
  branches: BranchInfo[]
  selectedBranchIndex: number
  currentBranch: string

  // Filter / search
  searchQuery: string
  isSearching: boolean

  // Status for selected branch
  status: StatusEntry[]

  // Worktree state
  worktrees: WorktreeInfo[]
  selectedWorktreeIndex: number

  // Stash state
  stashes: StashEntry[]
  selectedStashIndex: number

  // Log state
  logEntries: LogEntry[]

  // UI state
  notification: Notification | null
  busyMessage: string | null
  confirmDialog: ConfirmDialog | null
  inputDialog: InputDialog | null
  isMenuOpen: boolean

  // Actions - data loading
  refreshAll: (opts?: { fetch?: boolean }) => Promise<void>

  // Actions - navigation
  setCurrentView: (view: View) => void
  selectBranch: (index: number) => void
  moveBranchSelection: (delta: number) => void
  selectWorktree: (index: number) => void
  moveWorktreeSelection: (delta: number) => void
  selectStash: (index: number) => void
  moveStashSelection: (delta: number) => void

  // Actions - search
  setSearchQuery: (query: string) => void
  toggleSearch: () => void

  // Actions - branch operations
  doDeleteBranch: (name: string, force?: boolean) => Promise<void>
  doDeleteRemoteBranch: (name: string) => Promise<void>
  doPull: (branch: string) => Promise<void>
  doPush: (branch: string) => Promise<void>
  doCheckout: (name: string) => Promise<void>
  doCreateBranch: (name: string, startPoint?: string) => Promise<void>
  doRenameBranch: (oldName: string, newName: string) => Promise<void>
  doMerge: (branch: string) => Promise<void>
  doRebase: (branch: string) => Promise<void>
  doFetchAll: () => Promise<void>

  // Actions - worktree operations
  doAddWorktree: (path: string, branch: string, options?: { createBranch?: boolean; startPoint?: string }) => Promise<void>
  doRemoveWorktree: (path: string, force?: boolean) => Promise<void>
  doMoveWorktree: (oldPath: string, newPath: string) => Promise<void>
  doPruneWorktrees: () => Promise<void>

  // Actions - stash operations
  doStashSave: (message?: string) => Promise<void>
  doStashPop: (index?: number) => Promise<void>
  doStashDrop: (index: number) => Promise<void>

  // Actions - cleanup
  doCleanRepo: (dryRun?: boolean) => Promise<string[]>

  // Actions - UI
  showNotification: (type: Notification['type'], message: string) => void
  clearNotification: () => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
  closeConfirm: () => void
  showInput: (title: string, placeholder: string, onSubmit: (value: string) => void, options?: { allowEmpty?: boolean; defaultValue?: string }) => void
  closeInput: () => void
  setMenuOpen: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function filterBranches(branches: BranchInfo[], query: string): BranchInfo[] {
  if (!query) return branches
  const q = query.toLowerCase()
  return branches.filter((b) => b.name.toLowerCase().includes(q))
}

// ---------------------------------------------------------------------------
// Notification timer management
// ---------------------------------------------------------------------------

let notificationTimer: ReturnType<typeof setTimeout> | null = null

function clearNotificationTimer(): void {
  if (notificationTimer !== null) {
    clearTimeout(notificationTimer)
    notificationTimer = null
  }
}

// ---------------------------------------------------------------------------
// Dialog callback refs (kept outside state to avoid storing functions in state)
// ---------------------------------------------------------------------------

let _confirmCallback: (() => void) | null = null
let _inputCallback: ((value: string) => void) | null = null

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>()((set, get) => {
  // -- Shared action runner -------------------------------------------------
  // Runs a git operation, shows notification, and refreshes.

  const debouncedRefresh = debounce(() => get().refreshAll({ fetch: true }), 150)

  async function runAction(
    operation: () => Promise<ExecResult>,
    successMsg: string,
    errorPrefix: string,
    opts?: { refresh?: boolean; fetch?: boolean; busyMsg?: string },
  ): Promise<void> {
    if (opts?.busyMsg) set({ busyMessage: opts.busyMsg })
    const result = await operation()
    if (result.ok) {
      get().showNotification('success', successMsg)
    } else {
      get().showNotification('error', `${errorPrefix}: ${result.message}`)
    }
    set({ busyMessage: null })
    if (opts?.refresh !== false) await get().refreshAll(opts?.fetch ? { fetch: true } : undefined)
  }

  return {
    // -- Initial state --------------------------------------------------------

    currentView: 'branches',

    branches: [],
    selectedBranchIndex: 0,
    currentBranch: '',

    searchQuery: '',
    isSearching: false,

    status: [],

    worktrees: [],
    selectedWorktreeIndex: 0,

    stashes: [],
    selectedStashIndex: 0,
    isMenuOpen: false,

    logEntries: [],

    notification: null,
    busyMessage: null,
    confirmDialog: null,
    inputDialog: null,

    // -- Data loading ---------------------------------------------------------

    async refreshAll(opts?: { fetch?: boolean }) {
      const showBusy = opts?.fetch && !get().notification
      if (showBusy) set({ busyMessage: 'Fetching remotes...' })
      if (opts?.fetch) {
        try { await fetchAll() } catch { /* ignore fetch errors */ }
      }

      // Fetch all data in parallel, then apply in a single set()
      const [worktrees, status, stashes] = await Promise.all([
        getWorktrees(),
        getStatus(),
        getStashes(),
      ])
      const branches = await getBranches(worktrees)
      const currentBranch = branches.find((b) => b.isCurrent)?.name ?? ''

      // Resolve selected branch index
      const { selectedBranchIndex: prevIdx, branches: oldBranches, searchQuery } = get()
      let selectedBranchIndex: number
      if (oldBranches.length === 0) {
        const filtered = filterBranches(branches, searchQuery)
        const currentIndex = filtered.findIndex((b) => b.isCurrent)
        selectedBranchIndex = currentIndex >= 0 ? currentIndex : 0
      } else {
        const oldFiltered = filterBranches(oldBranches, searchQuery)
        const oldSelectedName = oldFiltered[prevIdx]?.name
        const newFiltered = filterBranches(branches, searchQuery)
        let newIndex = oldSelectedName ? newFiltered.findIndex((b) => b.name === oldSelectedName) : -1
        if (newIndex < 0) newIndex = clamp(prevIdx, 0, Math.max(0, newFiltered.length - 1))
        selectedBranchIndex = newIndex
      }

      const filtered = filterBranches(branches, searchQuery)
      const idx = clamp(selectedBranchIndex, 0, Math.max(0, filtered.length - 1))
      const logEntries = filtered.length > 0
        ? await getLog(filtered[idx]!.name, 15)
        : []

      set({ worktrees, status, stashes, branches, currentBranch, selectedBranchIndex, logEntries, busyMessage: null })
    },

    // -- Navigation -----------------------------------------------------------

    setCurrentView(view) {
      set({ currentView: view, isMenuOpen: false })
    },

    selectBranch(index) {
      const { branches, searchQuery } = get()
      const filtered = filterBranches(branches, searchQuery)
      const clamped = clamp(index, 0, Math.max(0, filtered.length - 1))
      set({ selectedBranchIndex: clamped, logEntries: [] })
      debouncedRefresh()
    },

    moveBranchSelection(delta) {
      const { branches, selectedBranchIndex, searchQuery } = get()
      const filtered = filterBranches(branches, searchQuery)
      if (filtered.length === 0) return
      const next = clamp(selectedBranchIndex + delta, 0, filtered.length - 1)
      set({ selectedBranchIndex: next, logEntries: [] })
      debouncedRefresh()
    },

    selectWorktree(index) {
      const { worktrees } = get()
      set({ selectedWorktreeIndex: clamp(index, 0, Math.max(0, worktrees.length - 1)) })
    },

    moveWorktreeSelection(delta) {
      const { worktrees, selectedWorktreeIndex } = get()
      if (worktrees.length === 0) return
      set({ selectedWorktreeIndex: clamp(selectedWorktreeIndex + delta, 0, worktrees.length - 1) })
    },

    selectStash(index) {
      const { stashes } = get()
      set({ selectedStashIndex: clamp(index, 0, Math.max(0, stashes.length - 1)) })
    },

    moveStashSelection(delta) {
      const { stashes, selectedStashIndex } = get()
      if (stashes.length === 0) return
      set({ selectedStashIndex: clamp(selectedStashIndex + delta, 0, stashes.length - 1) })
    },

    // -- Search ---------------------------------------------------------------

    setSearchQuery(query) {
      set({ searchQuery: query, selectedBranchIndex: 0 })
    },

    toggleSearch() {
      const { isSearching } = get()
      if (isSearching) {
        set({ isSearching: false, searchQuery: '', selectedBranchIndex: 0 })
      } else {
        set({ isSearching: true })
      }
    },

    // -- Branch operations ----------------------------------------------------

    async doDeleteBranch(name, force = false) {
      const wt = get().worktrees.find((w) => w.branch === name)
      if (wt) {
        const title = wt.isDirty ? 'Remove Dirty Worktree & Delete Branch' : 'Remove Worktree & Delete Branch'
        const msg = wt.isDirty
          ? `Branch "${name}" has a worktree at ${wt.path} with uncommitted changes. Force remove worktree and delete branch?`
          : `Branch "${name}" has a worktree at ${wt.path}. Remove worktree and delete branch?`
        get().showConfirm(title, msg, async () => {
          const rmResult = await removeWorktree(wt.path, wt.isDirty)
          if (!rmResult.ok) {
            get().showNotification('error', `Remove worktree failed: ${rmResult.message}`)
            return
          }
          await get().refreshAll()
          await get().doDeleteBranch(name, force)
        })
        return
      }
      const result = await deleteBranch(name, force)
      if (result.ok) {
        get().showNotification('success', `Deleted branch "${name}"`)
        await get().refreshAll()
      } else if (!force && result.message.includes('not fully merged')) {
        get().showConfirm('Force Delete', `Branch "${name}" is not fully merged. Force delete?`, () => get().doDeleteBranch(name, true))
      } else {
        get().showNotification('error', `Delete failed: ${result.message}`)
        await get().refreshAll()
      }
    },

    async doDeleteRemoteBranch(name) {
      await runAction(
        () => deleteRemoteBranch(name),
        `Deleted remote branch "${name}"`,
        'Delete remote failed',
        { busyMsg: `Deleting remote "${name}"...` },
      )
    },

    async doPull(branch) {
      const isCurrent = branch === get().currentBranch
      await runAction(
        () => pullBranch(branch, isCurrent),
        `Pulled "${branch}"`,
        'Pull failed',
        { busyMsg: `Pulling "${branch}"...` },
      )
    },

    async doPush(branch) {
      await runAction(
        () => pushBranch(branch),
        `Pushed "${branch}"`,
        'Push failed',
        { busyMsg: `Pushing "${branch}"...`, fetch: true },
      )
    },

    async doCheckout(name) {
      await runAction(
        () => checkoutBranch(name),
        `Checked out "${name}"`,
        'Checkout failed',
        { busyMsg: `Checking out "${name}"...` },
      )
    },

    async doCreateBranch(name, startPoint) {
      await runAction(
        () => createBranch(name, startPoint),
        `Created branch "${name}"`,
        'Create failed',
        { busyMsg: `Creating branch "${name}"...` },
      )
    },

    async doRenameBranch(oldName, newName) {
      await runAction(
        () => renameBranch(oldName, newName),
        `Renamed "${oldName}" to "${newName}"`,
        'Rename failed',
        { busyMsg: `Renaming "${oldName}"...` },
      )
    },

    async doMerge(branch) {
      await runAction(
        () => mergeBranch(branch),
        `Merged "${branch}"`,
        'Merge failed',
        { busyMsg: `Merging "${branch}"...` },
      )
    },

    async doRebase(branch) {
      await runAction(
        () => rebaseBranch(branch),
        `Rebased onto "${branch}"`,
        'Rebase failed',
        { busyMsg: `Rebasing onto "${branch}"...` },
      )
    },

    async doFetchAll() {
      await runAction(
        () => fetchAll(),
        'Fetched all remotes',
        'Fetch failed',
        { busyMsg: 'Fetching all remotes...' },
      )
    },

    // -- Worktree operations --------------------------------------------------

    async doAddWorktree(path, branch, options) {
      await runAction(
        () => addWorktree(path, branch, options),
        `Added worktree at "${path}"`,
        'Add worktree failed',
      )
    },

    async doRemoveWorktree(path, force) {
      await runAction(
        () => removeWorktree(path, force),
        `Removed worktree at "${path}"`,
        'Remove worktree failed',
      )
    },

    async doMoveWorktree(oldPath, newPath) {
      await runAction(
        () => moveWorktree(oldPath, newPath),
        `Moved worktree to "${newPath}"`,
        'Move worktree failed',
      )
    },

    async doPruneWorktrees() {
      await runAction(
        () => pruneWorktrees(),
        'Pruned stale worktrees',
        'Prune failed',
      )
    },

    // -- Stash operations -----------------------------------------------------

    async doStashSave(message) {
      await runAction(
        () => stashSave(message),
        message ? `Stashed: "${message}"` : 'Changes stashed',
        'Stash save failed',
      )
    },

    async doStashPop(index) {
      await runAction(
        () => stashPop(index),
        `Popped stash${index !== undefined ? ` @{${index}}` : ''}`,
        'Stash pop failed',
      )
    },

    async doStashDrop(index) {
      await runAction(
        () => stashDrop(index),
        `Dropped stash @{${index}}`,
        'Stash drop failed',
      )
    },

    // -- Cleanup --------------------------------------------------------------

    async doCleanRepo(dryRun = false) {
      const files = await cleanRepo(dryRun)
      if (dryRun) {
        get().showNotification(
          'info',
          files.length > 0 ? `${files.length} file(s) would be removed` : 'Nothing to clean',
        )
      } else {
        get().showNotification('success', `Cleaned ${files.length} file(s)`)
        await get().refreshAll()
      }
      return files
    },

    // -- UI helpers -----------------------------------------------------------

    showNotification(type, message) {
      clearNotificationTimer()
      set({ notification: { type, message } })
      notificationTimer = setTimeout(() => {
        notificationTimer = null
        set({ notification: null })
      }, 3000)
    },

    clearNotification() {
      clearNotificationTimer()
      set({ notification: null })
    },

    showConfirm(title, message, onConfirm) {
      _confirmCallback = onConfirm
      set({ confirmDialog: { title, message } })
    },

    closeConfirm() {
      _confirmCallback = null
      set({ confirmDialog: null })
    },

    showInput(title, placeholder, onSubmit, options) {
      _inputCallback = onSubmit
      set({ inputDialog: { title, placeholder, allowEmpty: options?.allowEmpty, defaultValue: options?.defaultValue } })
    },

    closeInput() {
      _inputCallback = null
      set({ inputDialog: null })
    },

    setMenuOpen(open: boolean) {
      set({ isMenuOpen: open })
    },
  }
})

// ---------------------------------------------------------------------------
// Public accessors for dialog callbacks (used by App.tsx)
// ---------------------------------------------------------------------------

export function getConfirmCallback(): (() => void) | null {
  return _confirmCallback
}

export function getInputCallback(): ((value: string) => void) | null {
  return _inputCallback
}

// ---------------------------------------------------------------------------
// Derived selectors
// ---------------------------------------------------------------------------

/** True when a modal overlay (dialog, menu, search) is active and normal key input should be suppressed. */
export function selectIsInputBlocked(s: AppState): boolean {
  return s.confirmDialog !== null || s.inputDialog !== null || s.isMenuOpen || s.isSearching
}
