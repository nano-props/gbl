import React from 'react'
import { Text, Box } from 'ink'

export interface HintKey {
  key: string
  label: string
}

const KEY_SYMBOLS: Record<string, string> = {
  enter: '⏎',
  return: '⏎',
  tab: '⇥',
  esc: '⎋',
  escape: '⎋',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
}

interface HintProps {
  keys: HintKey[]
  marginTop?: number
}

export function Hint({ keys, marginTop = 0 }: HintProps) {
  return (
    <Box marginTop={marginTop} gap={1}>
      {keys.map(({ key, label }, i) => {
        const symbol = KEY_SYMBOLS[key] ?? KEY_SYMBOLS[key.toLowerCase()] ?? key
        return (
          <Box key={i}>
            <Text bold color="yellow">
              {symbol}
            </Text>
            <Text dimColor> {label}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
