import React from 'react'
import { Box, Text } from 'ink'
import type { WorktreeInfo } from '@/git/types.ts'

interface WorktreeDetailProps {
  worktree: WorktreeInfo
}

export function WorktreeDetail({ worktree }: WorktreeDetailProps) {
  return (
    <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Box>
        <Text bold color="cyan">
          Path:{' '}
        </Text>
        <Text>{worktree.path}</Text>
      </Box>
      <Box>
        <Text bold color="cyan">
          Branch:{' '}
        </Text>
        <Text>{worktree.branch || '(detached)'}</Text>
      </Box>
      <Box>
        <Text bold color="cyan">
          Commit:{' '}
        </Text>
        <Text color="yellow">{worktree.head.slice(0, 7)}</Text>
      </Box>
      <Box>
        <Text bold color="cyan">
          Status:{' '}
        </Text>
        {worktree.isDirty === true && <Text color="yellow">dirty (uncommitted changes)</Text>}
        {worktree.isDirty === false && <Text color="green">clean</Text>}
        {worktree.isDirty === undefined && <Text dimColor>unknown</Text>}
      </Box>
      {worktree.isMainWorktree && <Text color="green">Main worktree</Text>}
      {worktree.isLocked && <Text color="yellow">Locked</Text>}
    </Box>
  )
}
