import React, { useCallback, useMemo, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { useAppStore, selectIsInputBlocked } from '@/store/useAppStore.ts'
import { cleanRepo } from '@/git/index.ts'
import { ActionMenu, type ActionItem } from '@/ui/components/ActionMenu.tsx'
import { Hint } from '@/ui/components/Hint.tsx'

const BUILD_ARTIFACTS = [
  'node_modules',
  'dist',
  'build',
  '.next',
  '__pycache__',
  'target',
  '.turbo',
  '.parcel-cache',
  '.cache',
  'coverage',
  '.nyc_output',
  'out',
]

export function CleanupView() {
  const doCleanRepo = useAppStore((s) => s.doCleanRepo)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const showConfirm = useAppStore((s) => s.showConfirm)
  const showNotification = useAppStore((s) => s.showNotification)
  const isInputBlocked = useAppStore(selectIsInputBlocked)
  const menuOpen = useAppStore((s) => s.isMenuOpen)
  const setMenuOpen = useAppStore((s) => s.setMenuOpen)

  const [dryRunOutput, setDryRunOutput] = useState<string[]>([])
  const [foundArtifacts, setFoundArtifacts] = useState<string[]>([])

  const doDryRun = useCallback(async () => {
    try {
      const files = await cleanRepo(true)
      setDryRunOutput(files.length > 0 ? files : ['Nothing to clean'])
    } catch {
      showNotification('error', 'Failed to run git clean dry run')
    }
    const found = BUILD_ARTIFACTS.filter((dir) => existsSync(dir))
    setFoundArtifacts(found)
  }, [showNotification])

  const doClean = useCallback(() => {
    showConfirm(
      'Git Clean',
      'Execute git clean -fd? This will permanently remove untracked files and directories.',
      () => {
        doCleanRepo()
        setDryRunOutput([])
      },
    )
  }, [showConfirm, doCleanRepo])

  const doRemoveArtifacts = useCallback(() => {
    const found = BUILD_ARTIFACTS.filter((dir) => existsSync(dir))
    if (found.length === 0) {
      showNotification('info', 'No common build artifacts found')
      return
    }
    showConfirm(
      'Remove Build Artifacts',
      `Remove ${found.length} director${found.length === 1 ? 'y' : 'ies'}? ${found.join(', ')}`,
      async () => {
        try {
          for (const dir of found) await rm(dir, { recursive: true, force: true })
          showNotification('success', `Removed: ${found.join(', ')}`)
          setFoundArtifacts([])
        } catch {
          showNotification('error', 'Failed to remove some artifacts')
        }
      },
    )
  }, [showConfirm, showNotification])

  const actionItems = useMemo(
    (): ActionItem[] => [
      { key: 'd', label: 'Preview (dry run)', color: 'yellow', action: doDryRun },
      { key: 'c', label: 'Execute git clean', color: 'red', action: doClean },
      { key: 'r', label: 'Remove build artifacts', color: 'red', action: doRemoveArtifacts },
    ],
    [doDryRun, doClean, doRemoveArtifacts],
  )

  useInput((input, key) => {
    if (isInputBlocked) return

    if (key.escape) {
      setCurrentView('branches')
      return
    }
    if (key.tab) {
      setMenuOpen(true)
      return
    }
    if (input === 'd') {
      doDryRun()
      return
    }
    if (input === 'c') {
      doClean()
      return
    }
    if (input === 'r') {
      doRemoveArtifacts()
      return
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Cleanup
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text bold color="yellow">
            d
          </Text>{' '}
          - Preview files that would be removed (dry run)
        </Text>
        <Text>
          <Text bold color="red">
            c
          </Text>{' '}
          - Execute git clean (remove untracked files)
        </Text>
        <Text>
          <Text bold color="red">
            r
          </Text>{' '}
          - Remove common build artifacts (node_modules, dist, etc.)
        </Text>
      </Box>

      {dryRunOutput.length > 0 && (
        <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold>Git Clean Preview:</Text>
          {dryRunOutput.map((line, i) => (
            <Text key={i} color="yellow">
              {line}
            </Text>
          ))}
        </Box>
      )}

      {foundArtifacts.length > 0 && (
        <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold>Found Build Artifacts:</Text>
          {foundArtifacts.map((dir) => (
            <Text key={dir} color="red">
              {dir}/
            </Text>
          ))}
          <Text dimColor>Press r to remove these directories</Text>
        </Box>
      )}

      {foundArtifacts.length === 0 && dryRunOutput.length === 0 && (
        <Text dimColor>Press d to scan for cleanable files and build artifacts</Text>
      )}

      {menuOpen ? (
        <Box marginTop={1}>
          <ActionMenu items={actionItems} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        </Box>
      ) : (
        <Hint
          marginTop={1}
          keys={[
            { key: 'esc', label: 'back' },
            { key: 'tab', label: 'actions' },
            { key: 'q', label: 'quit' },
          ]}
        />
      )}
    </Box>
  )
}
