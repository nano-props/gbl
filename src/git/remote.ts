import { git, gitResult, gitResultIn } from './helper.ts'
import type { ExecResult } from './helper.ts'
import { getCurrentBranch } from './branches.ts'

/**
 * Normalise a git remote URL into a browsable https URL, or return null if
 * it doesn't look like one of the formats we understand. Handles:
 *   - ssh://[user@]host[:port]/owner/repo[.git][/]
 *   - http(s)://[user[:pw]@]host/owner/repo[.git][/]
 *   - [user@]host:owner/repo[.git]        (scp-like, e.g. git@github.com:foo/bar.git)
 *
 * URL-scheme forms are checked first so the scp regex doesn't grab them —
 * "https" would otherwise look like a host, and "//github.com/..." like a path.
 */
function remoteUrlToHttps(url: string): string | null {
  // ssh://[user@]host[:port]/path
  const sshUrl = url.match(/^ssh:\/\/(?:[^@]+@)?([^:/]+)(?::\d+)?\/(.+?)(?:\.git)?\/?$/)
  if (sshUrl) return `https://${sshUrl[1]}/${sshUrl[2]}`

  // http(s)://[user[:pw]@]host/path
  const httpsUrl = url.match(/^https?:\/\/(?:[^@/]+@)?([^/]+)\/(.+?)(?:\.git)?\/?$/)
  if (httpsUrl) return `https://${httpsUrl[1]}/${httpsUrl[2]}`

  // scp-like: [user@]host:path — path must not start with `/` (that'd be a
  // scheme like ssh://). This branch catches forms like git@github.com:foo/bar.
  const scpUrl = url.match(/^(?:[^@]+@)?([^:/\s]+):([^/].*?)(?:\.git)?\/?$/)
  if (scpUrl) return `https://${scpUrl[1]}/${scpUrl[2]}`

  return null
}

export async function getGitHubUrl(): Promise<string | null> {
  try {
    const url = await git(['remote', 'get-url', 'origin'])
    if (!url) return null
    return remoteUrlToHttps(url)
  } catch {
    return null
  }
}

export async function fetchAll(): Promise<ExecResult> {
  return gitResult('fetch', '--all', '--prune')
}

export async function pullBranch(branch: string, worktreePath?: string): Promise<ExecResult> {
  // If the branch is checked out in another worktree, `fetch X:X` in the main
  // repo is refused by git ("refusing to fetch into branch ... checked out
  // at ..."). Run `pull --ff-only` inside that worktree instead, which
  // updates HEAD there without needing a ref-level fast-forward.
  if (worktreePath) {
    return gitResultIn(worktreePath, 'pull', '--ff-only', 'origin', branch)
  }
  // `fetch origin X:X` would similarly be refused for the currently checked-
  // out branch of the main repo, so fall back to `pull --ff-only` in that
  // case too.
  const current = await getCurrentBranch()
  if (branch === current) {
    return gitResult('pull', '--ff-only', 'origin', branch)
  }
  return gitResult('fetch', 'origin', `${branch}:${branch}`)
}

export async function pushBranch(branch: string): Promise<ExecResult> {
  return gitResult('push', '-u', 'origin', branch)
}
