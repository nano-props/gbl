import React, { useMemo } from 'react'
import { Box, Text } from 'ink'
import { useAppStore } from '@/store/useAppStore.ts'
import { BranchItem } from './BranchItem.tsx'

interface BranchesListPanelProps {
  maxVisible: number
}

export function BranchesListPanel({ maxVisible }: BranchesListPanelProps) {
  const branches = useAppStore((s) => s.branches)
  const selectedBranchIndex = useAppStore((s) => s.selectedBranchIndex)

  const scrollOffset = useMemo(() => {
    if (branches.length <= maxVisible) return 0
    let offset = selectedBranchIndex - Math.floor(maxVisible / 2)
    if (offset < 0) offset = 0
    if (offset > branches.length - maxVisible) {
      offset = branches.length - maxVisible
    }
    return offset
  }, [selectedBranchIndex, branches.length, maxVisible])

  const visibleBranches = branches.slice(scrollOffset, scrollOffset + maxVisible)

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="column">
        {scrollOffset > 0 && <Text dimColor>  ↑ {scrollOffset} more</Text>}
        {visibleBranches.map((branch, i) => (
          <BranchItem key={branch.name} branch={branch} isSelected={scrollOffset + i === selectedBranchIndex} />
        ))}
        {scrollOffset + maxVisible < branches.length && (
          <Text dimColor>  ↓ {branches.length - scrollOffset - maxVisible} more</Text>
        )}
        {branches.length === 0 && <Text dimColor>  no branches</Text>}
      </Box>
    </Box>
  )
}
