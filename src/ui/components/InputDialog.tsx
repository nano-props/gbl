import React, { useState } from 'react'
import { Text, Box, useInput } from 'ink'

interface InputDialogProps {
  title: string
  placeholder: string
  onSubmit: (value: string) => void
  onCancel: () => void
  allowEmpty?: boolean
  defaultValue?: string
}

export function InputDialog({ title, placeholder, onSubmit, onCancel, allowEmpty, defaultValue }: InputDialogProps) {
  const [value, setValue] = useState(defaultValue ?? '')

  useInput((input, key) => {
    if (key.escape) {
      onCancel()
      return
    }
    if (key.return) {
      if (value.trim() || allowEmpty) onSubmit(value.trim())
      return
    }
    if (key.backspace || key.delete) {
      setValue(v => v.slice(0, -1))
      return
    }
    if (input && !key.ctrl && !key.meta) {
      setValue(v => v + input)
    }
  })

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">{title}</Text>
      <Box marginTop={1}>
        <Text color="green">{value}</Text>
        <Text backgroundColor="white"> </Text>
        {!value && <Text dimColor> {placeholder}</Text>}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Enter to submit, Esc to cancel</Text>
      </Box>
    </Box>
  )
}
