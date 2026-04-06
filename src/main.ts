#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { App } from '@/ui/App.tsx'

const VERSION = '1.2.0'
const DESCRIPTION = 'Git Branch (& Worktree) List'

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

// Set terminal title (will be updated with branch name by App)
process.stdout.write('\x1b]0;GBL\x07')

render(React.createElement(App))
