import React from 'react'
import { Box, Text, useInput } from 'ink'
import open from 'open'
import type { BranchInfo, WorktreeInfo } from '@/git/types.ts'
import { useAppStore, selectIsInputBlocked } from '@/store/useAppStore.ts'
import { statusLabel, shortenPath } from '@/ui/components/BranchDetail.tsx'

const INVALID_BRANCH_RE = /[\s~^:?*\[\\]/

interface WorktreePanelProps {
  branch: BranchInfo
  worktrees: WorktreeInfo[]
  onClose: () => void
}

export function WorktreePanel({ branch, worktrees, onClose }: WorktreePanelProps) {
  const wt = worktrees.find((w) => w.path === branch.worktreePath)

  const isInputBlocked = useAppStore(selectIsInputBlocked)
  const showInput = useAppStore((s) => s.showInput)
  const showConfirm = useAppStore((s) => s.showConfirm)
  const showNotification = useAppStore((s) => s.showNotification)
  const doAddWorktree = useAppStore((s) => s.doAddWorktree)
  const doRemoveWorktree = useAppStore((s) => s.doRemoveWorktree)
  const doMoveWorktree = useAppStore((s) => s.doMoveWorktree)

  useInput((input, key) => {
    if (isInputBlocked) return

    if (input === 'o') {
      open(branch.worktreePath!).catch(() => showNotification('error', 'Failed to open directory'))
      return
    }
    if (input === 'n') {
      showInput('New Branch', `New branch name (from ${branch.name})`, (newBranch: string) => {
        if (INVALID_BRANCH_RE.test(newBranch)) {
          showNotification('error', 'Invalid branch name')
          return
        }
        const defaultPath = '../' + newBranch.replace(/\//g, '_')
        showInput(
          'Worktree Path',
          'Path for worktree directory',
          (path: string) => {
            doAddWorktree(path, newBranch, { createBranch: true, startPoint: branch.name })
          },
          { defaultValue: defaultPath },
        )
      })
      return
    }
    if (input === 'd' && wt && !wt.isMainWorktree) {
      if (wt.isLocked) {
        showNotification('error', 'Worktree is locked')
        return
      }
      if (wt.isDirty) {
        showConfirm('Remove Dirty Worktree', `Worktree has uncommitted changes. Force remove?`, () => {
          doRemoveWorktree(wt.path, true)
          onClose()
        })
      } else {
        showConfirm('Remove Worktree', `Remove worktree at "${wt.path}"?`, () => {
          doRemoveWorktree(wt.path)
          onClose()
        })
      }
      return
    }
    if (input === 'm' && wt && !wt.isMainWorktree) {
      if (wt.isLocked) {
        showNotification('error', 'Worktree is locked')
        return
      }
      showInput('Move Worktree', `New path (current: ${wt.path})`, (newPath: string) => {
        doMoveWorktree(wt.path, newPath)
      })
      return
    }
    if (key.escape) {
      onClose()
      return
    }
  })

  return (
    <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1}>
      <Text bold color="magenta">
        Worktree for "{branch.name}"
      </Text>
      {wt ? (
        <>
          <Box>
            <Text bold color="cyan">
              Path:{' '}
            </Text>
            <Text>{wt.path}</Text>
          </Box>
          <Box>
            <Text bold color="cyan">
              Commit:{' '}
            </Text>
            <Text color="yellow">{wt.head.slice(0, 7)}</Text>
          </Box>
          <Box>
            <Text bold color="cyan">
              Status:{' '}
            </Text>
            {wt.isDirty === true && <Text color="yellow">dirty ({wt.statusFiles?.length ?? 0} file(s))</Text>}
            {wt.isDirty === false && <Text color="green">clean</Text>}
            {wt.isDirty === undefined && <Text dimColor>unknown</Text>}
          </Box>
          {wt.statusFiles && wt.statusFiles.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color="cyan">
                Changes ({wt.statusFiles.length}):
              </Text>
              {wt.statusFiles.map((f, i) => {
                const label = statusLabel(f.x, f.y)
                return (
                  <Text key={i}>
                    <Text color={label.color}> {label.text} </Text>
                    <Text>{shortenPath(f.path)}</Text>
                  </Text>
                )
              })}
            </Box>
          )}
          {wt.isMainWorktree && <Text color="green">Main worktree</Text>}
          {wt.isLocked && <Text color="yellow">Locked</Text>}
        </>
      ) : (
        <Box>
          <Text bold color="cyan">
            Path:{' '}
          </Text>
          <Text>{branch.worktreePath}</Text>
        </Box>
      )}
    </Box>
  )
}
