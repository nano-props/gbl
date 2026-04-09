# AGENTS.md

## Commands

- Run the CLI from the repo: `./gbl`
- Show help: `./gbl --help`
- Build the standalone binary: `bun run build`
- Type-check: `./node_modules/.bin/tsc --noEmit -p tsconfig.json`

## Verification notes

- `gbl` is an interactive TUI and expects a real TTY.
- In non-interactive shells, `./gbl` should print: `gbl requires an interactive terminal (TTY).`
- The `./gbl` wrapper should preserve the caller's current working directory so git operations target the repo where the command was invoked.
