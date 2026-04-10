import React from 'react'
import { Box, Text } from 'ink'
import type { WorktreeInfo } from '@/git/types.ts'

interface WorktreeItemProps {
  worktree: WorktreeInfo
  isSelected: boolean
}

export function WorktreeItem({ worktree, isSelected }: WorktreeItemProps) {
  const pointer = isSelected ? '> ' : '  '

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
          {pointer}
        </Text>
        <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
          {worktree.branch || '(detached)'}
        </Text>
        <Text dimColor> {worktree.head.slice(0, 7)}</Text>
        {worktree.isMainWorktree && <Text color="green"> [main]</Text>}
        {worktree.isLocked && <Text color="yellow"> [locked]</Text>}
        {worktree.isDirty === true && <Text color="yellow"> *</Text>}
        {worktree.isDirty === false && <Text color="green"> ✓</Text>}
      </Box>
      <Text dimColor> {worktree.path}</Text>
    </Box>
  )
}
