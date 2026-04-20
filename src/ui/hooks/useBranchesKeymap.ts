import { useInput } from 'ink'
import open from 'open'
import type { BranchInfo } from '@/git/types.ts'
import { getGitHubUrl } from '@/git/remote.ts'
import { useAppStore } from '@/store/useAppStore.ts'
import { useBranchesLayout } from './useBranchesLayout.ts'

/**
 * Registers the key bindings for the branches view.
 * All logic is inline here so the key → action mapping stays easy to scan.
 */
export function useBranchesKeymap(selectedBranch: BranchInfo | null): void {
  // Selectors — grouped by concern so each line is a pure store read.
  const selectBranch = useAppStore((s) => s.selectBranch)
  const moveBranchSelection = useAppStore((s) => s.moveBranchSelection)
  const toggleShowLog = useAppStore((s) => s.toggleShowLog)
  const toggleShowStatus = useAppStore((s) => s.toggleShowStatus)
  const doCheckout = useAppStore((s) => s.doCheckout)
  const doPull = useAppStore((s) => s.doPull)
  const doPush = useAppStore((s) => s.doPush)
  const doFetchAll = useAppStore((s) => s.doFetchAll)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const showNotification = useAppStore((s) => s.showNotification)

  // Derived values.
  const { maxVisible } = useBranchesLayout()
  // Page step: skip ~one screenful of rows, leaving a row of overlap so the
  // user can see the previous context line.
  const pageStep = Math.max(1, maxVisible - 1)

  const openGitHub = async () => {
    try {
      const url = await getGitHubUrl()
      if (url) await open(url)
      else showNotification('error', 'No GitHub URL found')
    } catch {
      showNotification('error', 'Failed to open GitHub URL')
    }
  }

  useInput((input, key) => {
    if (key.upArrow) {
      moveBranchSelection(-1)
      return
    }
    if (key.downArrow) {
      moveBranchSelection(1)
      return
    }
    if (key.pageUp) {
      moveBranchSelection(-pageStep)
      return
    }
    if (key.pageDown) {
      moveBranchSelection(pageStep)
      return
    }
    if (key.home) {
      selectBranch(0)
      return
    }
    if (key.end) {
      // `selectBranch` itself clamps against the branches array — a large
      // sentinel is simpler than re-deriving the length here.
      selectBranch(Number.MAX_SAFE_INTEGER)
      return
    }

    if (key.return && selectedBranch) {
      doCheckout(selectedBranch.name)
      return
    }
    if (input === 'p' && selectedBranch) {
      doPull(selectedBranch.name, selectedBranch.worktreePath)
      return
    }
    if (input === 'P' && selectedBranch) {
      doPush(selectedBranch.name)
      return
    }
    if (input === 'f') {
      doFetchAll()
      return
    }
    if (input === '?') {
      setCurrentView('help')
      return
    }
    if (input === 'l') {
      toggleShowLog()
      return
    }
    if (input === 's') {
      toggleShowStatus()
      return
    }
    if (input === 'g') {
      openGitHub()
      return
    }
  })
}
