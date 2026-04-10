import React, { useCallback, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import { useAppStore, selectIsInputBlocked } from '@/store/useAppStore.ts'
import { ActionMenu, type ActionItem } from '@/ui/components/ActionMenu.tsx'
import { Hint } from '@/ui/components/Hint.tsx'
import { StashItem } from '@/ui/components/StashItem.tsx'
import { StashDetail } from '@/ui/components/StashDetail.tsx'

export function StashesView() {
  const stashes = useAppStore((s) => s.stashes)
  const selectedStashIndex = useAppStore((s) => s.selectedStashIndex)
  const isInputBlocked = useAppStore(selectIsInputBlocked)

  const moveStashSelection = useAppStore((s) => s.moveStashSelection)
  const doStashSave = useAppStore((s) => s.doStashSave)
  const doStashPop = useAppStore((s) => s.doStashPop)
  const doStashDrop = useAppStore((s) => s.doStashDrop)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const showConfirm = useAppStore((s) => s.showConfirm)
  const showInput = useAppStore((s) => s.showInput)

  const menuOpen = useAppStore((s) => s.isMenuOpen)
  const setMenuOpen = useAppStore((s) => s.setMenuOpen)

  const selectedStash = stashes[selectedStashIndex] ?? null

  const doSave = useCallback(() => {
    showInput(
      'Save Stash',
      'Stash message (optional, press Enter to skip)',
      (message: string) => doStashSave(message || undefined),
      { allowEmpty: true },
    )
  }, [showInput, doStashSave])

  const doPop = useCallback(() => {
    if (selectedStash) doStashPop(selectedStash.index)
  }, [selectedStash, doStashPop])

  const doDrop = useCallback(() => {
    if (selectedStash)
      showConfirm(
        'Drop Stash',
        `Drop stash@{${selectedStash.index}}: "${selectedStash.message}"? This cannot be undone.`,
        () => doStashDrop(selectedStash.index),
      )
  }, [selectedStash, showConfirm, doStashDrop])

  const actionItems = useMemo(
    (): ActionItem[] => [
      { key: 's', label: 'Save stash', action: doSave },
      { key: 'a', label: 'Apply (pop)', action: doPop },
      { key: 'd', label: 'Drop stash', color: 'red', action: doDrop },
    ],
    [doSave, doPop, doDrop],
  )

  useInput((input, key) => {
    if (menuOpen) return
    if (key.upArrow) {
      moveStashSelection(-1)
      return
    }
    if (key.downArrow) {
      moveStashSelection(1)
      return
    }
    if (isInputBlocked) return

    if (key.escape) {
      setCurrentView('branches')
      return
    }
    if (key.tab) {
      setMenuOpen(true)
      return
    }
    if (input === 's') {
      doSave()
      return
    }
    if (input === 'a') {
      doPop()
      return
    }
    if (input === 'd') {
      doDrop()
      return
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Stashes ({stashes.length})
        </Text>
      </Box>

      <Box flexDirection="column">
        {stashes.length === 0 && <Text dimColor>No stashes found. Press s to save a new stash.</Text>}
        {stashes.map((stash, i) => (
          <StashItem key={stash.index} stash={stash} isSelected={i === selectedStashIndex} />
        ))}
      </Box>

      {menuOpen ? (
        <Box marginTop={1}>
          <ActionMenu items={actionItems} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        </Box>
      ) : (
        <>
          {selectedStash && <StashDetail stash={selectedStash} />}
          <Hint
            marginTop={1}
            keys={[
              { key: 'esc', label: 'back' },
              { key: 's', label: 'save' },
              { key: 'a', label: 'pop' },
              { key: 'd', label: 'drop' },
              { key: 'tab', label: 'actions' },
              { key: 'q', label: 'quit' },
            ]}
          />
        </>
      )}
    </Box>
  )
}
