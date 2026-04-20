import React from 'react'
import { Text } from 'ink'

interface NotificationProps {
  type: 'success' | 'error' | 'info'
  message: string
}

export function Notification({ type, message }: NotificationProps) {
  const color = type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'
  return (
    <Text color={color} wrap="truncate-end">
      {icon} {message}
    </Text>
  )
}
