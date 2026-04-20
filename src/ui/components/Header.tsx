import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { useAppStore } from '@/store/useAppStore.ts'
import { Notification } from './Notification.tsx'

/**
 * Flat single-line status bar: brand · repo (branch) · N dirty · N branches · fetched Xs ago.
 * Right side: busy spinner or notification.
 */
export function Header() {
  const repoName = useAppStore((s) => s.repoName)
  const currentBranch = useAppStore((s) => s.currentBranch)
  const statusCount = useAppStore((s) => s.statusCount)
  const branchCount = useAppStore((s) => s.branches.length)
  const lastFetchedAt = useAppStore((s) => s.lastFetchedAt)
  const busyMessage = useAppStore((s) => s.busyMessage)
  const notification = useAppStore((s) => s.notification)

  // Tick every 10s to refresh the "fetched Xs ago" label.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  const fetchedAgo = lastFetchedAt ? formatAgo(Date.now() - lastFetchedAt) : null

  return (
    <Box paddingX={1} minHeight={1}>
      <Box flexShrink={0}>
        <Text bold color="cyan">
          GBL
        </Text>
        <Text dimColor>  </Text>
        <Text>{repoName || '...'}</Text>
        {currentBranch && (
          <>
            <Text dimColor> (</Text>
            <Text color="green">{currentBranch}</Text>
            <Text dimColor>)</Text>
          </>
        )}
        {statusCount > 0 && (
          <>
            <Text dimColor>  ·  </Text>
            <Text color="yellow">{statusCount} dirty</Text>
          </>
        )}
        {branchCount > 0 && (
          <>
            <Text dimColor>  ·  {branchCount} branches</Text>
          </>
        )}
        {fetchedAgo && (
          <>
            <Text dimColor>  ·  fetched {fetchedAgo}</Text>
          </>
        )}
      </Box>
      <Box flexGrow={1} justifyContent="flex-end" paddingLeft={1} minWidth={0}>
        {busyMessage ? (
          <Text dimColor wrap="truncate-end">
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>{' '}
            {busyMessage}
          </Text>
        ) : notification ? (
          <Notification type={notification.type} message={notification.message} />
        ) : null}
      </Box>
    </Box>
  )
}

function formatAgo(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
