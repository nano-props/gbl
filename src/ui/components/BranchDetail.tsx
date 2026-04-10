import React, { useState } from 'react'
import { Text, Box, useInput } from 'ink'
import type { BranchInfo, StatusEntry, LogEntry, WorktreeInfo } from '@/git/index.ts'
import { useAppStore, selectIsInputBlocked } from '@/store/useAppStore.ts'

const CHANGES_COLLAPSED_LIMIT = 8

export function shortenPath(p: string, maxLen = 60): string {
  if (p.length <= maxLen) return p
  const parts = p.split('/')
  if (parts.length <= 2) return p
  const fileName = parts[parts.length - 1]!
  const parentDir = parts[parts.length - 2]!
  return `.../${parentDir}/${fileName}`
}

export function statusLabel(x: string, y: string): { text: string; color: string } {
  if (x === '?' || y === '?') return { text: '??', color: 'gray' }
  if (x === 'D' || y === 'D') return { text: 'D ', color: 'red' }
  if (x === 'A') return { text: 'A ', color: 'green' }
  if (x === 'R') return { text: 'R ', color: 'yellow' }
  if (x === 'M' || y === 'M') return { text: 'M ', color: 'yellow' }
  return { text: `${x}${y}`, color: 'red' }
}

interface BranchDetailProps {
  branch: BranchInfo
  status: StatusEntry[]
  logEntries: LogEntry[]
  showLog: boolean
  worktrees?: WorktreeInfo[]
}

export function BranchDetail({ branch, status, logEntries, showLog, worktrees }: BranchDetailProps) {
  const [changesExpanded, setChangesExpanded] = useState(false)
  const isInputBlocked = useAppStore(selectIsInputBlocked)

  useInput((input) => {
    if (isInputBlocked) return
    if (input === 'e' && !showLog && (branch.isCurrent || branch.worktreePath)) {
      setChangesExpanded((v) => !v)
    }
  })

  const changes = branch.isCurrent
    ? status
    : (worktrees?.find((w) => w.path === branch.worktreePath)?.statusFiles ?? [])

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
      <Box>
        <Text bold color="cyan">
          Branch:{' '}
        </Text>
        <Text bold>{branch.name}</Text>
      </Box>
      <Box>
        <Text bold color="cyan">
          Commit:{' '}
        </Text>
        <Text color="yellow">{branch.lastCommitHash}</Text>
        <Text> {branch.lastCommitMessage}</Text>
      </Box>
      <Box>
        <Text bold color="cyan">
          Author:{' '}
        </Text>
        <Text>{branch.lastCommitAuthor}</Text>
        <Text dimColor> ({branch.lastCommitDate})</Text>
      </Box>

      {/* Tracking info */}
      {branch.tracking && (
        <Box>
          <Text bold color="cyan">
            Track:{' '}
          </Text>
          <Text>{branch.tracking}</Text>
          {branch.trackingGone ? (
            <Text color="yellow"> (remote gone)</Text>
          ) : branch.ahead > 0 || branch.behind > 0 ? (
            <Text color="yellow">
              {' '}
              (ahead {branch.ahead}, behind {branch.behind})
            </Text>
          ) : (
            <Text color="green"> (up to date)</Text>
          )}
        </Box>
      )}
      {!branch.tracking && !branch.isRemote && (
        <Box>
          <Text bold color="cyan">
            Track:{' '}
          </Text>
          <Text color="yellow">no remote tracking branch</Text>
        </Box>
      )}

      {/* Worktree info */}
      {branch.worktreePath && (
        <Box>
          <Text bold color="cyan">
            Wktree:{' '}
          </Text>
          <Text color="magenta">{branch.worktreePath}</Text>
        </Box>
      )}

      {/* Log and changes are mutually exclusive */}
      {showLog ? (
        logEntries.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color="cyan">
              Recent commits:
            </Text>
            {logEntries.slice(0, 5).map((entry, i) => (
              <Box key={i}>
                <Text color="yellow"> {entry.shortHash}</Text>
                <Text> {entry.message.length > 50 ? entry.message.slice(0, 50) + '...' : entry.message}</Text>
                <Text dimColor> ({entry.date})</Text>
              </Box>
            ))}
          </Box>
        )
      ) : changes.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="cyan">
            Changes ({changes.length}):
            {changes.length > CHANGES_COLLAPSED_LIMIT && (
              <Text dimColor> [e: {changesExpanded ? 'collapse' : 'expand'}]</Text>
            )}
          </Text>
          {(changesExpanded ? changes : changes.slice(0, CHANGES_COLLAPSED_LIMIT)).map((entry, i) => {
            const label = statusLabel(entry.x, entry.y)
            return (
              <Text key={i}>
                <Text color={label.color}> {label.text} </Text>
                <Text>{shortenPath(entry.path)}</Text>
              </Text>
            )
          })}
          {!changesExpanded && changes.length > CHANGES_COLLAPSED_LIMIT && (
            <Text dimColor> ... and {changes.length - CHANGES_COLLAPSED_LIMIT} more</Text>
          )}
        </Box>
      ) : branch.isCurrent || branch.worktreePath ? (
        <Box marginTop={1}>
          <Text color="green">Working tree clean</Text>
        </Box>
      ) : null}
    </Box>
  )
}
