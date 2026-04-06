import React from 'react'
import { Box, Text, useInput } from 'ink'
import { useAppStore } from '@/store/useAppStore.ts'

const CATEGORIES = [
  {
    title: 'Branch View',
    color: 'green',
    bindings: [
      ['Up/Down', 'Move selection'],
      ['Enter', 'Checkout selected branch'],
      ['p', 'Pull selected branch'],
      ['P', 'Push selected branch'],
      ['/', 'Search/filter branches'],
      ['l', 'Toggle commit log'],
      ['w', 'Worktree panel (toggle/create)'],
      ['g', 'Open GitHub repo page'],
    ],
  },
  {
    title: 'Navigation',
    color: 'cyan',
    bindings: [
      ['Tab', 'Open actions menu'],
      ['Esc', 'Back to branches'],
      ['?', 'Help'],
      ['q', 'Quit'],
    ],
  },
  {
    title: 'Worktree View',
    color: 'yellow',
    bindings: [
      ['d', 'Remove selected worktree'],
      ['p', 'Prune stale worktrees'],
      ['o', 'Open worktree directory'],
    ],
  },
  {
    title: 'Stash View',
    color: 'magenta',
    bindings: [
      ['s', 'Save new stash'],
      ['a', 'Apply (pop) selected stash'],
      ['d', 'Drop selected stash'],
    ],
  },
  {
    title: 'Cleanup View (via Tab menu)',
    color: 'red',
    bindings: [
      ['d', 'Dry run (preview)'],
      ['c', 'Execute git clean'],
      ['r', 'Remove build artifacts'],
    ],
  },
] as const

export function HelpView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView)

  useInput((input, key) => {
    if (input === '?' || key.escape) setCurrentView('branches')
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Help - Keybindings</Text>
      </Box>

      {CATEGORIES.map((cat) => (
        <Box key={cat.title} flexDirection="column" marginBottom={1}>
          <Text bold color={cat.color}>{cat.title}</Text>
          {cat.bindings.map(([key, desc]) => (
            <Box key={key + desc}>
              <Box width={12}><Text bold color="yellow">{key}</Text></Box>
              <Text>{desc}</Text>
            </Box>
          ))}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text dimColor>Press ? or Esc to go back</Text>
      </Box>
    </Box>
  )
}
