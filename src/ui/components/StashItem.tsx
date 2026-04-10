import React from 'react'
import { Box, Text } from 'ink'
import type { StashEntry } from '@/git/types.ts'

interface StashItemProps {
  stash: StashEntry
  isSelected: boolean
}

export function StashItem({ stash, isSelected }: StashItemProps) {
  const pointer = isSelected ? '> ' : '  '

  return (
    <Box>
      <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
        {pointer}
      </Text>
      <Text color="yellow">stash@{'{' + stash.index + '}'}</Text>
      <Text> {stash.message || '(no message)'}</Text>
    </Box>
  )
}
