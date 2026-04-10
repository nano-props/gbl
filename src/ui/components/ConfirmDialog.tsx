import React from 'react'
import { Text, Box, useInput } from 'ink'

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  useInput((input) => {
    if (input === 'y' || input === 'Y') onConfirm()
    else if (input === 'n' || input === 'N' || input === 'q') onCancel()
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text bold color="yellow">
        {title}
      </Text>
      <Text>{message}</Text>
      <Box marginTop={1}>
        <Text dimColor>Press </Text>
        <Text color="green" bold>
          y
        </Text>
        <Text dimColor> to confirm, </Text>
        <Text color="red" bold>
          n
        </Text>
        <Text dimColor> to cancel</Text>
      </Box>
    </Box>
  )
}
