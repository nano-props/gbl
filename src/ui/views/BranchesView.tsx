import React from 'react'
import { Box } from 'ink'
import { useAppStore } from '@/store/useAppStore.ts'
import { BranchesListPanel } from '@/ui/components/BranchesListPanel.tsx'
import { BranchDetail } from '@/ui/components/BranchDetail.tsx'
import { BranchesHint } from '@/ui/components/BranchesHint.tsx'
import { useBranchesKeymap } from '@/ui/hooks/useBranchesKeymap.ts'
import { useBranchesLayout } from '@/ui/hooks/useBranchesLayout.ts'

export function BranchesView() {
  const branches = useAppStore((s) => s.branches)
  const selectedBranchIndex = useAppStore((s) => s.selectedBranchIndex)
  const selectedBranch = branches[selectedBranchIndex] ?? null

  const { maxVisible, statusRowBudget } = useBranchesLayout()
  useBranchesKeymap(selectedBranch)

  return (
    <Box flexDirection="column" flexGrow={1} justifyContent="space-between" paddingX={1}>
      <Box flexDirection="column">
        <BranchesListPanel maxVisible={maxVisible} />
        {selectedBranch && <BranchDetail branch={selectedBranch} statusRowBudget={statusRowBudget} />}
      </Box>
      <BranchesHint />
    </Box>
  )
}
