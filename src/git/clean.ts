import { git } from "./helper.ts"

export async function cleanRepo(dryRun?: boolean): Promise<string[]> {
  try {
    const flag = dryRun ? "-fdn" : "-fd"
    const output = await git(["clean", flag])
    if (!output) return []

    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        return line.replace(/^(Would remove |Removing )/, "")
      })
  } catch {
    return []
  }
}
