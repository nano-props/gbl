import type { ExecResult } from '@/git/helper.ts'
import { useAppStore } from './useAppStore.ts'

// ---------------------------------------------------------------------------
// In-flight lock for serialised mutation operations
// ---------------------------------------------------------------------------

let actionInFlight = false

export function tryAcquireActionLock(): (() => void) | null {
  if (actionInFlight) return null
  actionInFlight = true
  let released = false
  return () => {
    if (released) return
    released = true
    actionInFlight = false
  }
}

/** Read-only probe used by the cron refresh to back off while a user-triggered
 * operation is in progress — otherwise the cron's own "Fetching remotes..."
 * spinner would stomp on the action's busyMessage. */
export function isActionInFlight(): boolean {
  return actionInFlight
}

// ---------------------------------------------------------------------------
// Notification timer
// ---------------------------------------------------------------------------

let notificationTimer: ReturnType<typeof setTimeout> | null = null

export function clearNotificationTimer(): void {
  if (notificationTimer !== null) {
    clearTimeout(notificationTimer)
    notificationTimer = null
  }
}

export function setNotificationTimer(cb: () => void, ms: number): void {
  clearNotificationTimer()
  notificationTimer = setTimeout(() => {
    notificationTimer = null
    cb()
  }, ms)
  // Don't keep the event loop alive for a transient UI timer —
  // otherwise `q` right after an action makes the process linger.
  notificationTimer.unref?.()
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ---------------------------------------------------------------------------
// runAction — shared wrapper with notification + refresh + lock
// ---------------------------------------------------------------------------

export async function runAction(
  operation: () => Promise<ExecResult>,
  successMsg: string,
  errorPrefix: string,
  opts?: { refresh?: boolean; fetch?: boolean; busyMsg?: string },
): Promise<void> {
  const release = tryAcquireActionLock()
  if (!release) {
    useAppStore.getState().showNotification('info', 'Another operation is in progress')
    return
  }
  let released = false
  try {
    if (opts?.busyMsg) useAppStore.setState({ busyMessage: opts.busyMsg })
    const result = await operation()
    if (result.ok) {
      useAppStore.getState().showNotification('success', successMsg)
    } else {
      useAppStore.getState().showNotification('error', `${errorPrefix}: ${result.message}`)
    }
    useAppStore.setState({ busyMessage: null })
    // Release the mutation lock BEFORE the follow-up refresh. The lock is
    // meant to serialise mutations (pull/push/checkout/fetch); the refresh
    // is just a read, and refreshAll itself protects against overlap via
    // its own refreshId counter. Holding the lock through refreshAll made
    // users see "Another operation is in progress" when they pressed `p`
    // right after seeing the success toast — even though the mutation was
    // long done.
    release()
    released = true
    if (opts?.refresh !== false) {
      await useAppStore.getState().refreshAll(opts?.fetch ? { fetch: true } : undefined)
    }
  } finally {
    if (!released) release()
  }
}
