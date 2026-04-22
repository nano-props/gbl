import React from 'react'
import { Box, Text, useInput } from 'ink'
import { useAppStore } from '@/store/useAppStore.ts'

const BINDINGS: Array<[string, string]> = [
  ['↑ / ↓', 'move selection'],
  ['⏎', 'checkout branch · open worktree in new tab'],
  ['⌥ ⏎', 'open worktree in new window'],
  ['p / P', 'pull / push selected branch'],
  ['f', 'fetch all remotes'],
  ['l', 'toggle commit log'],
  ['s', 'toggle git status'],
  ['g', 'open GitHub repo'],
  ['o', 'open pull request for selected branch'],
  ['?', 'toggle this help'],
  ['q', 'quit'],
]

export function HelpView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView)

  useInput((input, key) => {
    if (input === '?' || key.escape) setCurrentView('branches')
  })

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold color="cyan">
        keys
      </Text>
      <Box marginTop={1} flexDirection="column">
        {BINDINGS.map(([key, desc]) => (
          <Box key={key}>
            <Box width={10}>
              <Text color="yellow">{key}</Text>
            </Box>
            <Text dimColor>{desc}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>? or esc to go back</Text>
      </Box>
    </Box>
  )
}
