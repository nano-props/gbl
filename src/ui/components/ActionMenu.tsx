import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

export interface ActionItem {
  label: string
  key: string
  action: () => void
  color?: string
}

interface ActionMenuProps {
  items: ActionItem[]
  isOpen: boolean
  onClose: () => void
}

export function ActionMenu({ items, isOpen, onClose }: ActionMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useInput((input, key) => {
    if (!isOpen) return

    if (key.escape) {
      onClose()
      return
    }
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1))
      return
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(items.length - 1, i + 1))
      return
    }
    if (key.return) {
      items[selectedIndex]?.action()
      onClose()
      return
    }

    // Allow direct key press to trigger action
    const match = items.find((item) => item.key === input)
    if (match) {
      match.action()
      onClose()
    }
  })

  if (!isOpen) return null

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Actions
        </Text>
        <Text dimColor> (arrows/enter to select, or press key directly, esc to close)</Text>
      </Box>
      {items.map((item, i) => {
        const isSelected = i === selectedIndex
        const pointer = isSelected ? '> ' : '  '
        return (
          <Box key={item.key}>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {pointer}
            </Text>
            <Text color={item.color ?? (isSelected ? 'cyan' : undefined)} bold={isSelected}>
              [{item.key}]
            </Text>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {' '}
              {item.label}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
