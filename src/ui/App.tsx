import React, { useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import Spinner from 'ink-spinner'
import { Cron } from 'croner'
import { useAppStore } from '@/store/useAppStore.ts'
import { isActionInFlight } from '@/store/helpers.ts'
import { isGitRepo } from '@/git/branches.ts'
import { BranchesView } from '@/ui/views/BranchesView.tsx'
import { HelpView } from '@/ui/views/HelpView.tsx'
import { Header } from '@/ui/components/Header.tsx'
import { useTerminalSize } from '@/ui/hooks/useTerminalSize.ts'

const MIN_COLS = 80
const MIN_ROWS = 20

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

  return <AppMain rows={rows} />
}

function AppMain({ rows }: { rows: number }) {
  const { exit } = useApp()
  const currentView = useAppStore((s) => s.currentView)
  const branches = useAppStore((s) => s.branches)
  const isLoaded = useAppStore((s) => s.isLoaded)
  const refreshAll = useAppStore((s) => s.refreshAll)

  useInput((input) => {
    if (input === 'q') {
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
        process.exitCode = 1
        process.once('exit', () => {
          process.stderr.write('Not a git repository. Run gbl from inside a git repo.\n')
        })
        exit()
        return
      }
      refreshAll({ fetch: true })
      job = new Cron('* * * * *', () => {
        // Skip the periodic refresh while a user action is running: the cron's
        // "Fetching remotes..." spinner would otherwise overwrite the action's
        // own busyMessage mid-operation.
        if (isActionInFlight()) return
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
      case 'help':
        return <HelpView />
    }
  }

  const renderMain = () => {
    if (!isLoaded) {
      return (
        <Box paddingX={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
        </Box>
      )
    }
    if (currentView === 'branches' && branches.length === 0) {
      return (
        <Box paddingX={1} flexDirection="column">
          <Text color="yellow">No branches yet.</Text>
          <Text dimColor>Make your first commit to create a branch.</Text>
          <Text dimColor>Press q to quit.</Text>
        </Box>
      )
    }
    return renderView()
  }

  return (
    <Box flexDirection="column" height={rows}>
      <Header />
      <Box flexDirection="column" flexGrow={1}>
        {renderMain()}
      </Box>
    </Box>
  )
}
