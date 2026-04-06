import React from 'react'
import { Text, Box } from 'ink'
import type { BranchInfo } from '@/git/index.ts'

interface BranchItemProps {
  branch: BranchInfo
  isSelected: boolean
}

export function BranchItem({ branch, isSelected }: BranchItemProps) {
  const pointer = isSelected ? '>' : ' '
  const pointerColor = isSelected ? 'green' : undefined
  const nameColor = branch.isCurrent ? 'green' : branch.isRemote ? 'red' : 'white'

  let syncInfo = ''
  if (branch.isRemote) {
    syncInfo = 'remote'
  } else if (!branch.tracking) {
    syncInfo = 'local'
  } else if (branch.trackingGone) {
    syncInfo = 'gone'
  } else {
    const parts: string[] = []
    if (branch.ahead > 0) parts.push(`↑${branch.ahead}`)
    if (branch.behind > 0) parts.push(`↓${branch.behind}`)
    if (parts.length === 0) parts.push('✓')
    syncInfo = parts.join(' ')
  }

  const syncColor = syncInfo === '✓' ? 'green' : syncInfo === 'local' || syncInfo === 'gone' ? 'yellow' : 'cyan'
  const branchMark = branch.isCurrent ? '*' : branch.worktreePath ? '+' : ' '
  const markColor = branch.isCurrent ? 'green' : branch.worktreePath ? 'magenta' : undefined

  return (
    <Box>
      <Text color={pointerColor}>{pointer} </Text>
      <Text color={markColor}>{branchMark}</Text>
      <Text color={nameColor} bold={branch.isCurrent}> {branch.name}</Text>
      <Text> </Text>
      <Text color={syncColor}>{syncInfo}</Text>
    </Box>
  )
}
