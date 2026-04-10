#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { App } from '@/ui/App.tsx'

const VERSION = '1.2.0'
const DESCRIPTION = 'Git Branch (& Worktree) List'

function isInteractiveTerminal() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY && process.env.TERM !== 'dumb')
}

function formatFatalError(error: unknown) {
  if (error instanceof Error) {
    return {
      exitCode: 1,
      message: `${error.stack ?? error.message}\n`,
    }
  }

  return {
    exitCode: 1,
    message: `${String(error)}\n`,
  }
}

const arg = process.argv[2]

if (arg === '-v' || arg === '--version') {
  console.log(`gbl ${VERSION}`)
  process.exit(0)
}

if (arg === '-h' || arg === '--help') {
  console.log(`gbl ${VERSION} - ${DESCRIPTION}

Usage: gbl [options]

Options:
  -v, --version  Show version
  -h, --help     Show this help

Keys:
  ↑/↓            Navigate branches
  Enter           Checkout branch
  Tab             Open action menu
  p / P           Pull / Push
  w               Worktree operations
  /               Search branches
  l               Toggle commit log
  ?               Help
  q               Quit`)
  process.exit(0)
}

if (!isInteractiveTerminal()) {
  process.stderr.write('gbl requires an interactive terminal (TTY).\n')
  process.exit(1)
}

// Alternate screen buffer (fullscreen, like top/htop)
process.stdout.write(
  '\x1b[?1049h' + // enter alternate screen
    '\x1b[H' + // cursor to top-left
    '\x1b[2J' + // clear entire screen
    '\x1b]0;GBL\x07', // terminal title
)

let restored = false
function restoreTerminal() {
  if (restored) return
  restored = true
  process.stdout.write(
    '\x1b[?1049l', // leave alternate screen
  )
}

function exitWithError(error: unknown): never {
  restoreTerminal()
  const fatal = formatFatalError(error)
  process.stderr.write(fatal.message)
  process.exit(fatal.exitCode)
}

process.once('exit', restoreTerminal)
process.once('SIGINT', () => {
  restoreTerminal()
  process.exit(130)
})
process.once('SIGTERM', () => {
  restoreTerminal()
  process.exit(143)
})
process.once('uncaughtException', exitWithError)
process.once('unhandledRejection', exitWithError)

async function main() {
  const app = render(React.createElement(App))
  await app.waitUntilExit()
}

void main().catch(exitWithError)
