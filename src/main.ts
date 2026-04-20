#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { App } from '@/ui/App.tsx'
import pkg from '../package.json'

const VERSION = pkg.version
const DESCRIPTION = pkg.description

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
  PgUp/PgDn      Jump one page
  Home/End       Jump to first / last branch
  Enter          Checkout branch
  p / P          Pull / Push
  f              Fetch all remotes
  g              Open GitHub repo in browser
  l              Toggle commit log
  s              Toggle git status
  ?              Help
  q              Quit`)
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
  // Force exit in case any stray handle (timers, watchers, subprocess stdio)
  // is still keeping the event loop alive.
  process.exit(process.exitCode ?? 0)
}

void main().catch(exitWithError)
