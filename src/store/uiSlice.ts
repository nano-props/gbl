import type { StateCreator } from 'zustand'
import type { AppState } from './useAppStore.ts'
import { clearNotificationTimer, setNotificationTimer } from './helpers.ts'

export type View = 'branches' | 'help'

export interface Notification {
  type: 'success' | 'error' | 'info'
  message: string
}

export interface UISlice {
  currentView: View
  notification: Notification | null
  busyMessage: string | null
  isLoaded: boolean
  lastFetchedAt: number | null

  setCurrentView: (view: View) => void
  showNotification: (type: Notification['type'], message: string) => void
  clearNotification: () => void
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  currentView: 'branches',
  notification: null,
  busyMessage: null,
  isLoaded: false,
  lastFetchedAt: null,

  setCurrentView(view) {
    set({ currentView: view })
  },

  showNotification(type, message) {
    clearNotificationTimer()
    set({ notification: { type, message } })
    setNotificationTimer(() => set({ notification: null }), 3000)
  },

  clearNotification() {
    clearNotificationTimer()
    set({ notification: null })
  },
})
