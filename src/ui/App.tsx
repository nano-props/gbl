import React, { useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { Cron } from 'croner'
import { useAppStore, getConfirmCallback, getInputCallback, selectIsInputBlocked } from '@/store/useAppStore.ts'
import { isGitRepo } from '@/git/index.ts'
import { BranchesView } from '@/ui/views/BranchesView.tsx'
import { WorktreesView } from '@/ui/views/WorktreesView.tsx'
import { StashesView } from '@/ui/views/StashesView.tsx'
import { CleanupView } from '@/ui/views/CleanupView.tsx'
import { HelpView } from '@/ui/views/HelpView.tsx'
import { Notification } from '@/ui/components/Notification.tsx'
import { ConfirmDialog } from '@/ui/components/ConfirmDialog.tsx'
import { InputDialog } from '@/ui/components/InputDialog.tsx'

export function App() {
  const currentView = useAppStore((s) => s.currentView)
  const branches = useAppStore((s) => s.branches)
  const notification = useAppStore((s) => s.notification)
  const busyMessage = useAppStore((s) => s.busyMessage)
  const confirmDialog = useAppStore((s) => s.confirmDialog)
  const inputDialog = useAppStore((s) => s.inputDialog)
  const refreshAll = useAppStore((s) => s.refreshAll)
  const closeConfirm = useAppStore((s) => s.closeConfirm)
  const closeInput = useAppStore((s) => s.closeInput)

  const currentBranch = useAppStore((s) => s.currentBranch)
  const isInputBlocked = useAppStore(selectIsInputBlocked)

  useInput((input) => {
    if (input === 'q' && !isInputBlocked) {
      process.exit(0)
    }
  })

  useEffect(() => {
    if (currentBranch) {
      process.stdout.write(`\x1b]0;GBL(${currentBranch})\x07`)
    }
  }, [currentBranch])

  useEffect(() => {
    let job: Cron | undefined
    let cancelled = false
    isGitRepo().then((ok) => {
      if (!ok) {
        console.error('Not a git repository. Run gbl from inside a git repo.')
        process.exit(1)
      }
      if (cancelled) return
      refreshAll({ fetch: true })
      job = new Cron('* * * * *', () => {
        refreshAll({ fetch: true })
      })
    })
    return () => { cancelled = true; job?.stop() }
  }, [])

  const renderView = () => {
    switch (currentView) {
      case 'branches': return <BranchesView />
      case 'worktrees': return <WorktreesView />
      case 'stashes': return <StashesView />
      case 'cleanup': return <CleanupView />
      case 'help': return <HelpView />
    }
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box paddingX={1} marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">GBL</Text>
          <Text dimColor> - Git Branch ({'&'} Worktree) List</Text>
        </Box>
        {busyMessage ? (
          <Text dimColor><Text color="cyan"><Spinner type="dots" /></Text> {busyMessage}</Text>
        ) : notification ? (
          <Notification type={notification.type} message={notification.message} />
        ) : null}
      </Box>

      {/* Main View */}
      {branches.length === 0 ? (
        <Box paddingX={1}>
          <Text color="cyan"><Spinner type="dots" /></Text>
        </Box>
      ) : (
        renderView()
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <Box paddingX={1} marginTop={1}>
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            onConfirm={() => { getConfirmCallback()?.(); closeConfirm() }}
            onCancel={closeConfirm}
          />
        </Box>
      )}

      {/* Input Dialog */}
      {inputDialog && (
        <Box paddingX={1} marginTop={1}>
          <InputDialog
            key={inputDialog.title}
            title={inputDialog.title}
            placeholder={inputDialog.placeholder}
            allowEmpty={inputDialog.allowEmpty}
            defaultValue={inputDialog.defaultValue}
            onSubmit={(value) => { const cb = getInputCallback(); closeInput(); cb?.(value) }}
            onCancel={closeInput}
          />
        </Box>
      )}
    </Box>
  )
}
