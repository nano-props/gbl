import React, { useMemo, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import open from 'open'
import { useAppStore, filterBranches, selectIsInputBlocked } from '@/store/useAppStore.ts'
import { getGitHubUrl, getCurrentPRUrl } from '@/git/index.ts'
import { BranchItem } from '@/ui/components/BranchItem.tsx'
import { BranchDetail } from '@/ui/components/BranchDetail.tsx'
import { WorktreePanel } from '@/ui/components/WorktreePanel.tsx'
import { SearchBar } from '@/ui/components/SearchBar.tsx'
import { ActionMenu, type ActionItem } from '@/ui/components/ActionMenu.tsx'
import { Hint } from '@/ui/components/Hint.tsx'

const MAX_VISIBLE = 15

const INVALID_BRANCH_RE = /[\s~^:?*\[\\]/

export function BranchesView() {
  const branches = useAppStore((s) => s.branches)
  const selectedBranchIndex = useAppStore((s) => s.selectedBranchIndex)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const isSearching = useAppStore((s) => s.isSearching)
  const status = useAppStore((s) => s.status)
  const logEntries = useAppStore((s) => s.logEntries)
  const isInputBlocked = useAppStore(selectIsInputBlocked)

  const moveBranchSelection = useAppStore((s) => s.moveBranchSelection)
  const doDeleteBranch = useAppStore((s) => s.doDeleteBranch)
  const doDeleteRemoteBranch = useAppStore((s) => s.doDeleteRemoteBranch)
  const doCreateBranch = useAppStore((s) => s.doCreateBranch)
  const doPull = useAppStore((s) => s.doPull)
  const doPush = useAppStore((s) => s.doPush)
  const doCheckout = useAppStore((s) => s.doCheckout)
  const doFetchAll = useAppStore((s) => s.doFetchAll)
  const toggleSearch = useAppStore((s) => s.toggleSearch)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const showConfirm = useAppStore((s) => s.showConfirm)
  const showInput = useAppStore((s) => s.showInput)
  const showNotification = useAppStore((s) => s.showNotification)

  const doAddWorktree = useAppStore((s) => s.doAddWorktree)
  const worktrees = useAppStore((s) => s.worktrees)
  const menuOpen = useAppStore((s) => s.isMenuOpen)
  const setMenuOpen = useAppStore((s) => s.setMenuOpen)

  const [showLog, setShowLog] = useState(false)
  const [worktreePanel, setWorktreePanel] = useState(false)

  const filteredBranches = useMemo(() => filterBranches(branches, searchQuery), [branches, searchQuery])

  const selectedBranch = filteredBranches[selectedBranchIndex] ?? null

  const scrollOffset = useMemo(() => {
    if (filteredBranches.length <= MAX_VISIBLE) return 0
    let offset = selectedBranchIndex - Math.floor(MAX_VISIBLE / 2)
    if (offset < 0) offset = 0
    if (offset > filteredBranches.length - MAX_VISIBLE) {
      offset = filteredBranches.length - MAX_VISIBLE
    }
    return offset
  }, [selectedBranchIndex, filteredBranches.length])

  const visibleBranches = filteredBranches.slice(scrollOffset, scrollOffset + MAX_VISIBLE)

  const openGitHub = async () => {
    try {
      const url = await getGitHubUrl()
      if (url) await open(url)
      else showNotification('error', 'No GitHub URL found')
    } catch { showNotification('error', 'Failed to open GitHub URL') }
  }

  const actionItems = useMemo((): ActionItem[] => [
    { key: 'f', label: 'Fetch all', action: () => doFetchAll() },
    { key: 'G', label: 'Open PRs', action: async () => {
      try {
        const prUrl = await getCurrentPRUrl()
        if (prUrl) await open(prUrl)
        else showNotification('error', 'No PR URL found')
      } catch { showNotification('error', 'Failed to open PR URL') }
    }},
    { key: 'W', label: 'All worktrees', action: () => setCurrentView('worktrees') },
    { key: 's', label: 'Stashes', action: () => setCurrentView('stashes') },
    { key: 'd', label: 'Delete local branch', color: 'red', action: () => selectedBranch && showConfirm('Delete Branch', `Delete local branch "${selectedBranch.name}"?`, () => doDeleteBranch(selectedBranch.name)) },
    { key: 'D', label: 'Delete remote branch', color: 'red', action: () => {
      if (!selectedBranch) return
      if (!selectedBranch.tracking) showNotification('error', 'No remote tracking branch')
      else if (selectedBranch.trackingGone) showNotification('error', `Remote branch "${selectedBranch.tracking}" is already gone`)
      else showConfirm('Delete Remote', `Delete remote branch "${selectedBranch.tracking}"? This cannot be undone.`, () => doDeleteRemoteBranch(selectedBranch.tracking!))
    }},
  ], [selectedBranch])

  useInput((input, key) => {
    if (menuOpen) return
    if (key.upArrow) { moveBranchSelection(-1); setWorktreePanel(false); return }
    if (key.downArrow) { moveBranchSelection(1); setWorktreePanel(false); return }
    if (isInputBlocked || worktreePanel) return

    if (key.return && selectedBranch) {
      if (selectedBranch.worktreePath && !selectedBranch.isCurrent) {
        showNotification('error', `Branch "${selectedBranch.name}" is checked out in worktree at ${selectedBranch.worktreePath}`)
        return
      }
      if (status.length > 0) {
        showConfirm('Checkout', `You have ${status.length} uncommitted change(s). Checkout "${selectedBranch.name}" anyway?`, () => doCheckout(selectedBranch.name))
      } else {
        doCheckout(selectedBranch.name)
      }
      return
    }
    if (input === 'p' && selectedBranch) { doPull(selectedBranch.name); return }
    if (input === 'P' && selectedBranch) { doPush(selectedBranch.name); return }
    if (input === '?') { setCurrentView('help'); return }
    if (input === '/') { toggleSearch(); return }
    if (input === 'w' && selectedBranch) {
      if (selectedBranch.worktreePath) {
        setWorktreePanel((v) => !v)
      } else {
        showInput('New Branch (optional)', `Leave empty to use "${selectedBranch.name}", or enter new branch name`, (branch: string) => {
          if (branch && INVALID_BRANCH_RE.test(branch)) { showNotification('error', 'Invalid branch name'); return }
          const targetBranch = branch || selectedBranch.name
          const defaultPath = '../' + targetBranch.replace(/\//g, '_')
          showInput('Worktree Path', 'Path for worktree directory', (path: string) => {
            if (branch) {
              doAddWorktree(path, branch, { createBranch: true, startPoint: selectedBranch.name })
            } else {
              doAddWorktree(path, selectedBranch.name)
            }
          }, { defaultValue: defaultPath })
        }, { allowEmpty: true })
      }
      return
    }
    if (input === 'n' && selectedBranch) {
      showInput('Create Branch', `New branch name (from ${selectedBranch.name})`, (name: string) => doCreateBranch(name, selectedBranch.name))
      return
    }
    if (input === 'l') { setShowLog((v) => !v); return }
    if (input === 'g') { openGitHub(); return }
    if (key.tab) { setMenuOpen(true); return }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Branches ({filteredBranches.length})</Text>
        {searchQuery && <Text dimColor> - filtered from {branches.length}</Text>}
      </Box>

      {isSearching && <Box marginBottom={1}><SearchBar /></Box>}

      <Box flexDirection="column">
        {scrollOffset > 0 && <Text dimColor>  ... {scrollOffset} more above</Text>}
        {visibleBranches.map((branch, i) => (
          <BranchItem key={branch.name} branch={branch} isSelected={scrollOffset + i === selectedBranchIndex} />
        ))}
        {scrollOffset + MAX_VISIBLE < filteredBranches.length && (
          <Text dimColor>  ... {filteredBranches.length - scrollOffset - MAX_VISIBLE} more below</Text>
        )}
        {filteredBranches.length === 0 && <Text dimColor>No branches found</Text>}
      </Box>

      {menuOpen ? (
        <Box marginTop={1}>
          <ActionMenu items={actionItems} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        </Box>
      ) : (
        <>
          {worktreePanel && selectedBranch?.worktreePath ? (
            <>
              <WorktreePanel branch={selectedBranch} worktrees={worktrees} onClose={() => setWorktreePanel(false)} />
              <Hint marginTop={1} keys={[
                { key: 'esc', label: 'back' },
                { key: 'o', label: 'open' },
                { key: 'n', label: 'new worktree' },
                { key: 'd', label: 'remove' },
                { key: 'm', label: 'move' },
                { key: 'q', label: 'quit' },
              ]} />
            </>
          ) : (
            <>
              {selectedBranch && (
                <BranchDetail branch={selectedBranch} status={status} logEntries={logEntries} showLog={showLog} worktrees={worktrees} />
              )}
              <Hint marginTop={1} keys={[
                { key: 'enter', label: 'checkout' },
                { key: 'tab', label: 'actions' },
                { key: 'p', label: 'pull' },
                { key: 'P', label: 'push' },
                { key: 'n', label: 'new branch' },
                { key: 'w', label: 'worktree' },
                ...(branches.length > MAX_VISIBLE ? [{ key: '/', label: 'search' }] : []),
                { key: 'l', label: 'log' },
                ...(selectedBranch?.isCurrent && !showLog && status.length > 8 ? [{ key: 'e', label: 'expand' }] : []),
                { key: '?', label: 'help' },
                { key: 'q', label: 'quit' },
              ]} />
            </>
          )}
        </>
      )}
    </Box>
  )
}
