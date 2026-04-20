import os from 'os'

const HOME = os.homedir()

/**
 * Replace the user's home directory prefix with `~`. Purely cosmetic — for
 * paths passed back to git (like `cwd`) use the original absolute path.
 *
 * Examples:
 *   /Users/jizhao/Developer/gbl  → ~/Developer/gbl
 *   /tmp/foo                     → /tmp/foo (unchanged)
 */
export function tildifyHome(p: string): string {
  if (!HOME) return p
  if (p === HOME) return '~'
  if (p.startsWith(HOME + '/')) return '~' + p.slice(HOME.length)
  return p
}
