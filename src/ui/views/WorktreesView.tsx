import React from 'react'
import { Box, Text, useInput } from 'ink'
import open from 'open'
import { useAppStore, selectIsInputBlocked } from '@/store/useAppStore.ts'
import { Hint } from '@/ui/components/Hint.tsx'
import { WorktreeItem } from '@/ui/components/WorktreeItem.tsx'
import { WorktreeDetail } from '@/ui/components/WorktreeDetail.tsx'

export function WorktreesView() {
  const worktrees = useAppStore((s) => s.worktrees)
  const selectedWorktreeIndex = useAppStore((s) => s.selectedWorktreeIndex)
  const isInputBlocked = useAppStore(selectIsInputBlocked)

  const moveWorktreeSelection = useAppStore((s) => s.moveWorktreeSelection)
  const doRemoveWorktree = useAppStore((s) => s.doRemoveWorktree)
  const doPruneWorktrees = useAppStore((s) => s.doPruneWorktrees)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const showConfirm = useAppStore((s) => s.showConfirm)
  const showNotification = useAppStore((s) => s.showNotification)

  const selectedWorktree = worktrees[selectedWorktreeIndex] ?? null

  useInput((input, key) => {
    if (key.upArrow) { moveWorktreeSelection(-1); return }
    if (key.downArrow) { moveWorktreeSelection(1); return }
    if (isInputBlocked) return

    if (key.escape) { setCurrentView('branches'); return }

    if (input === 'd') {
      if (!selectedWorktree || selectedWorktree.isMainWorktree) return
      if (selectedWorktree.isLocked) {
        showNotification('error', `Cannot remove: worktree is locked.`)
        return
      }
      if (selectedWorktree.isDirty) {
        showConfirm('Remove Dirty Worktree', `Worktree at "${selectedWorktree.path}" has uncommitted changes. Force remove?`, () => doRemoveWorktree(selectedWorktree.path, true))
      } else {
        showConfirm('Remove Worktree', `Remove worktree at "${selectedWorktree.path}"?`, () => doRemoveWorktree(selectedWorktree.path))
      }
      return
    }
    if (input === 'p') { doPruneWorktrees(); return }
    if (input === 'o') {
      if (selectedWorktree) {
        open(selectedWorktree.path).catch(() => showNotification('error', 'Failed to open directory'))
      }
      return
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">All Worktrees ({worktrees.length})</Text>
      </Box>

      <Box flexDirection="column">
        {worktrees.length === 0 && <Text dimColor>No worktrees found</Text>}
        {worktrees.map((wt, i) => (
          <WorktreeItem key={wt.path} worktree={wt} isSelected={i === selectedWorktreeIndex} />
        ))}
      </Box>

      {selectedWorktree && <WorktreeDetail worktree={selectedWorktree} />}
      <Hint marginTop={1} keys={[
        { key: 'esc', label: 'back' },
        { key: 'd', label: 'remove' },
        { key: 'p', label: 'prune' },
        { key: 'o', label: 'open' },
        { key: 'q', label: 'quit' },
      ]} />
    </Box>
  )
}
