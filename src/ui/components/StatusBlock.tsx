import React from 'react'
import { Text, Box } from 'ink'
import type { BranchInfo } from '@/git/types.ts'
import { useAppStore } from '@/store/useAppStore.ts'

/**
 * Mid-path ellipsis: keep the first segment and the last two so the reader
 * still recognises the file. Falls back to plain string if too short to split.
 */
function shortenPath(p: string, maxLen = 60): string {
  if (p.length <= maxLen) return p
  const parts = p.split('/')
  if (parts.length <= 3) return p
  const head = parts[0]
  const tail = parts.slice(-2).join('/')
  return `${head}/…/${tail}`
}

/**
 * Colour a two-char porcelain code (XY). Untracked (`??`) is gray; deletes
 * are red; adds green; renames and modifications yellow; everything else red.
 */
function statusCodeColor(x: string, y: string): string {
  if (x === '?' || y === '?') return 'gray'
  if (x === 'D' || y === 'D') return 'red'
  if (x === 'A') return 'green'
  if (x === 'R' || x === 'M' || y === 'M') return 'yellow'
  return 'red'
}

export function StatusBlock({ branch, rowBudget }: { branch: BranchInfo; rowBudget: number }) {
  const entries = useAppStore((s) => s.statusEntries)
  const entriesFor = useAppStore((s) => s.statusEntriesFor)
  const loading = useAppStore((s) => s.statusLoading)

  const viewable = branch.isCurrent || !!branch.worktreePath
  if (!viewable) {
    return (
      <Box marginTop={1}>
        <Text dimColor>(not checked out — no working tree to inspect)</Text>
      </Box>
    )
  }
  // Gate rendering on data belonging to *this* branch. Prevents the stale
  // flash where a previous branch's empty result briefly shows as "✓ clean"
  // while the new branch's fetch is still in flight.
  const dataMatches = entriesFor === branch.name
  if (!dataMatches || loading) {
    return (
      <Box marginTop={1}>
        <Text dimColor>loading…</Text>
      </Box>
    )
  }
  if (entries.length === 0) {
    return (
      <Box marginTop={1}>
        <Text color="green">✓ clean</Text>
      </Box>
    )
  }
  // Reserve 1 row for the header and potentially 1 for the "+ N more" tail.
  const headerRow = 1
  const hasMore = entries.length > rowBudget - headerRow
  const rowsForList = Math.max(1, rowBudget - headerRow - (hasMore ? 1 : 0))
  const visible = entries.slice(0, rowsForList)
  const hidden = entries.length - visible.length

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>status ({entries.length})</Text>
      {visible.map((entry, i) => {
        const color = statusCodeColor(entry.x, entry.y)
        return (
          <Box key={i}>
            <Box flexGrow={1} minWidth={0}>
              <Text wrap="truncate-end">
                <Text color={color}>
                  {entry.x}
                  {entry.y}
                </Text>
                <Text> {shortenPath(entry.path)}</Text>
              </Text>
            </Box>
          </Box>
        )
      })}
      {hidden > 0 && <Text dimColor>  + {hidden} more</Text>}
    </Box>
  )
}
