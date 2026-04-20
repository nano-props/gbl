/**
 * Layout row budgets for the branches view's scrollable branch list.
 *
 * The constants account for fixed chrome around the list: header, detail
 * block (separator + 3 lines), minimal hint, and breathing room.
 */

/** Rows reserved by BranchesView around the scrollable branch list. */
export const BRANCH_LIST_RESERVED = 11

/** Extra rows taken by the "recent commits" block when the log is shown. */
export const LOG_SECTION_ROWS = 7

/** Minimum rows the branch list must shrink to, to stay usable. */
export const MIN_LIST_ROWS = 5
