import { useInput } from 'ink'
import open from 'open'
import type { BranchInfo } from '@/git/types.ts'
import { getGitHubUrl, getPullRequestUrl } from '@/git/remote.ts'
import { useAppStore } from '@/store/useAppStore.ts'
import { openPathInNewTerminal, type OpenMode } from '@/utils/terminal.ts'
import { tildifyHome } from '@/utils/path.ts'

/**
 * Registers the key bindings for the branches view.
 * All logic is inline here so the key → action mapping stays easy to scan.
 */
export function useBranchesKeymap(selectedBranch: BranchInfo | null): void {
  // Selectors — grouped by concern so each line is a pure store read.
  const moveBranchSelection = useAppStore((s) => s.moveBranchSelection)
  const toggleShowLog = useAppStore((s) => s.toggleShowLog)
  const toggleShowStatus = useAppStore((s) => s.toggleShowStatus)
  const doCheckout = useAppStore((s) => s.doCheckout)
  const doPull = useAppStore((s) => s.doPull)
  const doPush = useAppStore((s) => s.doPush)
  const doFetchAll = useAppStore((s) => s.doFetchAll)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const showNotification = useAppStore((s) => s.showNotification)

  const openGitHub = async () => {
    try {
      const url = await getGitHubUrl()
      if (url) await open(url)
      else showNotification('error', 'No GitHub URL found')
    } catch {
      showNotification('error', 'Failed to open GitHub URL')
    }
  }

  const openPullRequest = async (branch: string) => {
    try {
      const url = await getPullRequestUrl(branch)
      if (url) await open(url)
      else showNotification('error', 'No GitHub URL found')
    } catch {
      showNotification('error', 'Failed to open pull request')
    }
  }

  const openWorktree = async (path: string, mode: OpenMode) => {
    const res = await openPathInNewTerminal(path, mode)
    if (res.ok) showNotification('success', `Opened "${tildifyHome(path)}"`)
    else showNotification('error', `Open failed: ${res.message}`)
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

    if (key.return && selectedBranch) {
      if (selectedBranch.worktreePath) {
        // Option+Enter → new window. Plain Enter → new tab.
        // `shift` can't be detected on Enter in a terminal (both keys
        // emit the same byte); `meta` works because Option+Enter sends
        // ESC+CR, which Ink parses as a meta modifier.
        openWorktree(selectedBranch.worktreePath, key.meta ? 'window' : 'tab')
      } else {
        doCheckout(selectedBranch.name)
      }
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
    if (input === 'o' && selectedBranch) {
      openPullRequest(selectedBranch.name)
      return
    }
  })
}
