import React from 'react'
import { Text, Box } from 'ink'
import type { LogEntry } from '@/git/types.ts'

export function LogBlock({ entries }: { entries: LogEntry[] }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>recent commits</Text>
      {entries.length === 0 ? (
        <Text dimColor>loading…</Text>
      ) : (
        entries.slice(0, 5).map((entry, i) => (
          <Box key={i}>
            <Box flexGrow={1} minWidth={0}>
              <Text wrap="truncate-end">
                <Text color="yellow">{entry.shortHash}</Text>
                <Text>  {entry.message}</Text>
                <Text dimColor>  ({entry.date})</Text>
              </Text>
            </Box>
          </Box>
        ))
      )}
    </Box>
  )
}
