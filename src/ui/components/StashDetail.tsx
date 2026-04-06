import React from 'react'
import { Box, Text } from 'ink'
import type { StashEntry } from '@/git/types.ts'

interface StashDetailProps {
  stash: StashEntry
}

export function StashDetail({ stash }: StashDetailProps) {
  return (
    <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Box><Text bold color="cyan">Index:   </Text><Text color="yellow">stash@{'{' + stash.index + '}'}</Text></Box>
      <Box><Text bold color="cyan">Message: </Text><Text>{stash.message || '(no message)'}</Text></Box>
      {stash.subject && <Box><Text bold color="cyan">Subject: </Text><Text>{stash.subject}</Text></Box>}
    </Box>
  )
}
