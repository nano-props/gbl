import { git, gitResult } from "./helper.ts"
import type { ExecResult } from "./helper.ts"
import type { StashEntry } from "./types.ts"

export async function getStashes(): Promise<StashEntry[]> {
  try {
    const GIT_SEP = "%%SEP%%"
    const SEP = "%SEP%"
    const format = [`%gd`, `%gs`, `%s`].join(GIT_SEP)
    const output = await git(["stash", "list", `--format=${format}`])
    if (!output) return []

    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(SEP)
        const refPart = parts[0] ?? ""
        const indexMatch = refPart.match(/\{(\d+)\}/)
        const index = indexMatch ? parseInt(indexMatch[1], 10) : 0

        return {
          index,
          message: parts[1] ?? "",
          subject: parts[2] ?? "",
        }
      })
  } catch {
    return []
  }
}

export async function stashSave(
  message?: string,
): Promise<ExecResult> {
  const args = ["stash", "push"]
  if (message) args.push("-m", message)
  return gitResult(...args)
}

export async function stashPop(
  index?: number,
): Promise<ExecResult> {
  const args = ["stash", "pop"]
  if (index !== undefined) args.push(`stash@{${index}}`)
  return gitResult(...args)
}

export async function stashDrop(
  index: number,
): Promise<ExecResult> {
  return gitResult("stash", "drop", `stash@{${index}}`)
}
