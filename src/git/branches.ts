import { git, gitResult } from "./helper.ts"
import type { ExecResult } from "./helper.ts"
import type { BranchInfo, StatusEntry, LogEntry, WorktreeInfo } from "./types.ts"

export async function isGitRepo(): Promise<boolean> {
  try {
    await git(["rev-parse", "--is-inside-work-tree"])
    return true
  } catch {
    return false
  }
}

export async function getCurrentBranch(): Promise<string> {
  try {
    return await git(["rev-parse", "--abbrev-ref", "HEAD"])
  } catch {
    return ""
  }
}

export async function getBranches(worktrees?: WorktreeInfo[]): Promise<BranchInfo[]> {
  try {
    // In git format strings, %% is a literal %. So "%%SEP%%" outputs "%SEP%".
    const GIT_SEP = "%%SEP%%"  // used in --format (git escaping)
    const SEP = "%SEP%"        // the actual separator in output
    const format = [
      "%(refname:short)",
      "%(objectname:short)",
      "%(subject)",
      "%(authordate:relative)",
      "%(authorname)",
      "%(upstream:short)",
      "%(upstream:track)",
    ].join(GIT_SEP)

    const output = await git([
      "for-each-ref",
      `--format=${format}`,
      "refs/heads/",
    ])

    if (!output) return []

    const currentBranch = await getCurrentBranch()

    const worktreeMap = new Map<string, { path: string; isDirty?: boolean }>()
    for (const wt of worktrees ?? []) {
      if (wt.branch) {
        worktreeMap.set(wt.branch, { path: wt.path, isDirty: wt.isDirty })
      }
    }

    const lines = output.split("\n").filter(Boolean)
    const branches: BranchInfo[] = []

    for (const line of lines) {
      const parts = line.split(SEP)
      const name = parts[0] ?? ""
      const hash = parts[1] ?? ""
      const subject = parts[2] ?? ""
      const date = parts[3] ?? ""
      const author = parts[4] ?? ""
      const upstream = parts[5] ?? ""
      const track = parts[6] ?? ""

      const isRemote = false

      let ahead = 0
      let behind = 0
      const aheadMatch = track.match(/ahead (\d+)/)
      const behindMatch = track.match(/behind (\d+)/)
      if (aheadMatch) ahead = parseInt(aheadMatch[1], 10)
      if (behindMatch) behind = parseInt(behindMatch[1], 10)

      const branchInfo: BranchInfo = {
        name,
        isCurrent: !isRemote && name === currentBranch,
        isRemote,
        ahead,
        behind,
        lastCommitHash: hash,
        lastCommitMessage: subject,
        lastCommitDate: date,
        lastCommitAuthor: author,
      }

      if (upstream) {
        branchInfo.tracking = upstream
        branchInfo.trackingGone = track.includes("gone")
      }

      const wtInfo = worktreeMap.get(name)
      if (wtInfo) {
        branchInfo.worktreePath = wtInfo.path
        branchInfo.worktreeDirty = wtInfo.isDirty
      }

      branches.push(branchInfo)
    }

    return branches
  } catch {
    return []
  }
}

export async function getStatus(): Promise<StatusEntry[]> {
  try {
    const output = await git(["status", "--porcelain"])
    if (!output) return []

    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => ({
        x: line[0] ?? " ",
        y: line[1] ?? " ",
        path: line.slice(3),
      }))
  } catch {
    return []
  }
}

export async function getLog(
  branch: string,
  count: number = 10,
): Promise<LogEntry[]> {
  try {
    const GIT_SEP = "%%SEP%%"
    const SEP = "%SEP%"
    const format = [`%H`, `%h`, `%s`, `%an`, `%ar`].join(GIT_SEP)
    const output = await git([
      "log",
      `--format=${format}`,
      "-n",
      String(count),
      branch,
    ])
    if (!output) return []

    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(SEP)
        return {
          hash: parts[0] ?? "",
          shortHash: parts[1] ?? "",
          message: parts[2] ?? "",
          author: parts[3] ?? "",
          date: parts[4] ?? "",
        }
      })
  } catch {
    return []
  }
}

export async function checkoutBranch(
  name: string,
): Promise<ExecResult> {
  return gitResult("checkout", name)
}

export async function createBranch(
  name: string,
  startPoint?: string,
): Promise<ExecResult> {
  const args = ["checkout", "-b", name]
  if (startPoint) args.push(startPoint)
  return gitResult(...args)
}

export async function deleteBranch(
  name: string,
  force?: boolean,
): Promise<ExecResult> {
  return gitResult("branch", force ? "-D" : "-d", name)
}

export async function deleteRemoteBranch(
  name: string,
): Promise<ExecResult> {
  const slashIndex = name.indexOf("/")
  if (slashIndex === -1) {
    return { ok: false, message: `Invalid remote branch format: ${name}` }
  }
  const remote = name.slice(0, slashIndex)
  const branch = name.slice(slashIndex + 1)
  return gitResult("push", remote, "--delete", branch)
}

export async function renameBranch(
  oldName: string,
  newName: string,
): Promise<ExecResult> {
  return gitResult("branch", "-m", oldName, newName)
}

export async function mergeBranch(
  branch: string,
): Promise<ExecResult> {
  return gitResult("merge", branch)
}

export async function rebaseBranch(
  branch: string,
): Promise<ExecResult> {
  return gitResult("rebase", branch)
}
