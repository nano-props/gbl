import { useAppStore } from '@/store/useAppStore.ts'
import { BRANCH_LIST_RESERVED, LOG_SECTION_ROWS, MIN_LIST_ROWS } from '@/ui/layout.ts'
import { useTerminalSize } from './useTerminalSize.ts'

/**
 * Layout budgets for the branches view.
 *
 * - `maxVisible`: rows available to the scrollable branch list.
 * - `statusRowBudget`: rows available to the status panel (when `showStatus`
 *   is on). Grows with terminal height so large repos can scan many files
 *   without scrolling.
 *
 * The log uses a small fixed budget (LOG_SECTION_ROWS) because it only ever
 * renders up to 5 entries. Status defaults to "as large as possible" by
 * giving the list its MIN_LIST_ROWS floor and handing the rest over.
 *
 * On very small terminals the sum is capped to the available rows so we
 * never overflow the fixed chrome (header, detail summary, hint).
 */
export function useBranchesLayout(): { maxVisible: number; statusRowBudget: number } {
  const { rows } = useTerminalSize()
  const showLog = useAppStore((s) => s.showLog)
  const showStatus = useAppStore((s) => s.showStatus)

  const logReserve = showLog ? LOG_SECTION_ROWS : 0
  const available = Math.max(0, rows - BRANCH_LIST_RESERVED - logReserve)

  if (showStatus) {
    // Favour the status panel: list keeps at least MIN_LIST_ROWS (but never
    // more than the available budget), status takes the rest.
    const listRows = Math.min(available, Math.max(MIN_LIST_ROWS, Math.floor(available / 3)))
    const statusRowBudget = Math.max(0, available - listRows)
    return { maxVisible: listRows, statusRowBudget }
  }

  const maxVisible = Math.max(MIN_LIST_ROWS, available)
  return { maxVisible, statusRowBudget: 0 }
}
