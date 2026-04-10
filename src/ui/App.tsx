import React, { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
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

const MIN_COLS = 80
const MIN_ROWS = 20

function useTerminalSize() {
  const [size, setSize] = useState({
    cols: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  })
  useEffect(() => {
    const onResize = () => setSize({ cols: process.stdout.columns, rows: process.stdout.rows })
    process.stdout.on('resize', onResize)
    return () => {
      process.stdout.off('resize', onResize)
    }
  }, [])
  return size
}

export function App() {
  const { exit } = useApp()
  const { cols, rows } = useTerminalSize()
  const tooSmall = cols < MIN_COLS || rows < MIN_ROWS

  useInput(
    (input) => {
      if (input === 'q') exit()
    },
    { isActive: tooSmall },
  )

  if (tooSmall) {
    return (
      <Box flexDirection="column" paddingX={1} paddingTop={1}>
        <Text color="yellow">Terminal too small</Text>
        <Text dimColor>
          Need at least {MIN_COLS}x{MIN_ROWS}, current {cols}x{rows}
        </Text>
        <Text dimColor>Resize your terminal or press q to quit</Text>
      </Box>
    )
  }

  return <AppMain />
}

function AppMain() {
  const { exit } = useApp()
  const currentView = useAppStore((s) => s.currentView)
  const branches = useAppStore((s) => s.branches)
  const notification = useAppStore((s) => s.notification)
  const busyMessage = useAppStore((s) => s.busyMessage)
  const confirmDialog = useAppStore((s) => s.confirmDialog)
  const inputDialog = useAppStore((s) => s.inputDialog)
  const refreshAll = useAppStore((s) => s.refreshAll)
  const closeConfirm = useAppStore((s) => s.closeConfirm)
  const closeInput = useAppStore((s) => s.closeInput)

  const isInputBlocked = useAppStore(selectIsInputBlocked)

  useInput((input) => {
    if (input === 'q' && !isInputBlocked) {
      exit()
    }
  })

  const currentBranch = useAppStore((s) => s.currentBranch)
  useEffect(() => {
    if (currentBranch) {
      process.stdout.write(`\x1b]0;GBL(${currentBranch})\x07`)
    }
  }, [currentBranch])

  useEffect(() => {
    let job: Cron | undefined
    let cancelled = false
    isGitRepo().then((ok) => {
      if (cancelled) return
      if (!ok) {
        // Error message must be printed after terminal is restored.
        // The 'exit' handler in main.ts restores the alternate screen first (registered earlier),
        // then this handler prints the error to the now-visible normal screen.
        process.exitCode = 1
        process.once('exit', () => {
          process.stderr.write('Not a git repository. Run gbl from inside a git repo.\n')
        })
        exit()
        return
      }
      refreshAll({ fetch: true })
      job = new Cron('* * * * *', () => {
        refreshAll({ fetch: true })
      })
    })
    return () => {
      cancelled = true
      job?.stop()
    }
  }, [])

  const renderView = () => {
    switch (currentView) {
      case 'branches':
        return <BranchesView />
      case 'worktrees':
        return <WorktreesView />
      case 'stashes':
        return <StashesView />
      case 'cleanup':
        return <CleanupView />
      case 'help':
        return <HelpView />
    }
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box paddingX={1} marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">
            GBL
          </Text>
          <Text dimColor> - Git Branch ({'&'} Worktree) List</Text>
        </Box>
        {busyMessage ? (
          <Text dimColor>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>{' '}
            {busyMessage}
          </Text>
        ) : notification ? (
          <Notification type={notification.type} message={notification.message} />
        ) : null}
      </Box>

      {/* Main View */}
      {branches.length === 0 ? (
        <Box paddingX={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
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
            onConfirm={() => {
              getConfirmCallback()?.()
              closeConfirm()
            }}
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
            onSubmit={(value) => {
              const cb = getInputCallback()
              closeInput()
              cb?.(value)
            }}
            onCancel={closeInput}
          />
        </Box>
      )}
    </Box>
  )
}
