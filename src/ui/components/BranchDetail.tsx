import React from 'react'
import { Text, Box } from 'ink'
import type { BranchInfo } from '@/git/types.ts'
import { useAppStore } from '@/store/useAppStore.ts'
import { tildifyHome } from '@/utils/path.ts'
import { LogBlock } from './LogBlock.tsx'
import { StatusBlock } from './StatusBlock.tsx'

interface BranchDetailProps {
  branch: BranchInfo
  statusRowBudget: number
}

function dirtySummary(branch: BranchInfo, statusCount: number, worktreeChangeCount: number | undefined): string | null {
  if (branch.isCurrent) return statusCount > 0 ? `● ${statusCount} dirty` : null
  if (branch.worktreePath && worktreeChangeCount && worktreeChangeCount > 0) {
    return `● ${worktreeChangeCount} dirty`
  }
  return null
}

function trackingSummary(branch: BranchInfo): { text: string; color: string } {
  if (!branch.tracking) return { text: 'no remote tracking', color: 'yellow' }
  if (branch.trackingGone) return { text: `${branch.tracking} (gone)`, color: 'yellow' }
  if (branch.ahead > 0 || branch.behind > 0) {
    const parts: string[] = []
    if (branch.ahead > 0) parts.push(`↑${branch.ahead}`)
    if (branch.behind > 0) parts.push(`↓${branch.behind}`)
    return { text: `${branch.tracking} ${parts.join(' ')}`, color: 'cyan' }
  }
  return { text: `${branch.tracking} ✓`, color: 'green' }
}

export function BranchDetail({ branch, statusRowBudget }: BranchDetailProps) {
  const statusCount = useAppStore((s) => s.statusCount)
  const logEntries = useAppStore((s) => s.logEntries)
  const worktrees = useAppStore((s) => s.worktrees)
  const showLog = useAppStore((s) => s.showLog)
  const showStatus = useAppStore((s) => s.showStatus)

  const worktreeChangeCount = branch.worktreePath
    ? worktrees.find((w) => w.path === branch.worktreePath)?.changeCount
    : undefined

  const track = trackingSummary(branch)
  const dirty = dirtySummary(branch, statusCount, worktreeChangeCount)

  return (
    <Box flexDirection="column" marginTop={1} paddingX={1}>
      <Box>
        <Text dimColor>────────</Text>
      </Box>

      <Box>
        <Box flexGrow={1} minWidth={0}>
          <Text wrap="truncate-end">
            <Text color="yellow">{branch.lastCommitHash}</Text>
            <Text>  {branch.lastCommitMessage}</Text>
          </Text>
        </Box>
      </Box>

      <Box>
        <Text dimColor wrap="truncate-end">
          by {branch.lastCommitAuthor} · {branch.lastCommitDate}
        </Text>
      </Box>

      <Box>
        <Text color={track.color} wrap="truncate-end">
          {track.text}
        </Text>
        {dirty && (
          <>
            <Text dimColor>  ·  </Text>
            <Text color="yellow">{dirty}</Text>
          </>
        )}
        {branch.worktreePath && (
          <>
            <Text dimColor>  ·  </Text>
            <Text color="magenta" wrap="truncate-end">
              {tildifyHome(branch.worktreePath)}
            </Text>
          </>
        )}
      </Box>

      {showLog && <LogBlock entries={logEntries} />}
      {showStatus && <StatusBlock branch={branch} rowBudget={statusRowBudget} />}
    </Box>
  )
}
