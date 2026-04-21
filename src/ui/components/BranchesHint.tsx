import React from 'react'
import { Box, Text } from 'ink'

/**
 * Minimal footer. The full keybinding reference lives in HelpView (`?`).
 */
export function BranchesHint() {
  return (
    <Box marginTop={1} paddingX={1}>
      <Text dimColor wrap="truncate-end">
        ↑↓ move · ⏎ checkout/open wt · p pull · P push · s status · l log · ? help · q quit
      </Text>
    </Box>
  )
}
