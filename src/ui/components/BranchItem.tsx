import React from 'react'
import { Text, Box } from 'ink'
import type { BranchInfo } from '@/git/types.ts'
import { SelectionPointer } from './SelectionPointer.tsx'

interface BranchItemProps {
  branch: BranchInfo
  isSelected: boolean
}

function syncSummary(branch: BranchInfo): { text: string; color: string } {
  if (!branch.tracking) return { text: 'local', color: 'yellow' }
  if (branch.trackingGone) return { text: 'gone', color: 'yellow' }
  if (branch.ahead === 0 && branch.behind === 0) return { text: '✓', color: 'green' }
  const parts: string[] = []
  if (branch.ahead > 0) parts.push(`↑${branch.ahead}`)
  if (branch.behind > 0) parts.push(`↓${branch.behind}`)
  return { text: parts.join(' '), color: 'cyan' }
}

export function BranchItem({ branch, isSelected }: BranchItemProps) {
  const nameColor = branch.isCurrent ? 'green' : isSelected ? 'cyan' : 'white'

  const sync = syncSummary(branch)

  const mark = branch.isCurrent ? '*' : branch.worktreePath ? '+' : ' '
  const markColor = branch.isCurrent ? 'green' : branch.worktreePath ? 'magenta' : undefined

  return (
    <Box>
      <SelectionPointer isSelected={isSelected} color="green" />
      <Text color={markColor}>{` ${mark}`}</Text>
      <Text color={nameColor} bold={branch.isCurrent || isSelected}>{` ${branch.name}`}</Text>
      <Text color={sync.color}>{` ${sync.text}`}</Text>
      {branch.worktreePath && !branch.isCurrent && branch.worktreeDirty && (
        <Text color="yellow"> (dirty)</Text>
      )}
    </Box>
  )
}
