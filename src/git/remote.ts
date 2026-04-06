import { git, gitResult } from "./helper.ts"
import type { ExecResult } from "./helper.ts"
import { getCurrentBranch } from "./branches.ts"

export async function getGitHubUrl(): Promise<string | null> {
  try {
    const url = await git(["remote", "get-url", "origin"])
    if (!url) return null

    const sshMatch = url.match(/^git@(.+?):(.+?)(?:\.git)?$/)
    if (sshMatch) {
      return `https://${sshMatch[1]}/${sshMatch[2]}`
    }

    const httpsMatch = url.match(/^https?:\/\/(.+?)\/(.+?)(?:\.git)?$/)
    if (httpsMatch) {
      return `https://${httpsMatch[1]}/${httpsMatch[2]}`
    }

    return null
  } catch {
    return null
  }
}

export async function getCurrentPRUrl(): Promise<string | null> {
  try {
    const githubUrl = await getGitHubUrl()
    if (!githubUrl) return null

    const branch = await getCurrentBranch()
    if (!branch) return null

    return `${githubUrl}/pulls?q=${encodeURIComponent(`is:pr head:${branch}`)}`
  } catch {
    return null
  }
}

export async function fetchAll(): Promise<ExecResult> {
  return gitResult("fetch", "--all", "--prune")
}

export async function pullBranch(
  branch: string,
  isCurrent: boolean,
): Promise<ExecResult> {
  if (isCurrent) {
    return gitResult("pull", "origin", branch)
  }
  return gitResult("fetch", "origin", `${branch}:${branch}`)
}

export async function pushBranch(
  branch: string,
): Promise<ExecResult> {
  return gitResult("push", "-u", "origin", branch)
}

export async function abortMerge(): Promise<ExecResult> {
  return gitResult("merge", "--abort")
}

export async function abortRebase(): Promise<ExecResult> {
  return gitResult("rebase", "--abort")
}
