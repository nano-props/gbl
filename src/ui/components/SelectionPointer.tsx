import React from 'react'
import { Text } from 'ink'

interface SelectionPointerProps {
  isSelected: boolean
  /** Color used when selected. Defaults to 'green'. */
  color?: string
}

/**
 * Leading pointer cell for selectable list rows. Renders a coloured chevron
 * (❯) when selected and a space otherwise; column alignment is preserved.
 */
export function SelectionPointer({ isSelected, color = 'green' }: SelectionPointerProps) {
  return (
    <Text color={isSelected ? color : undefined} bold={isSelected}>
      {isSelected ? '❯' : ' '}
    </Text>
  )
}
