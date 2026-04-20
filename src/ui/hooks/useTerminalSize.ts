import { useEffect, useState } from 'react'

export interface TerminalSize {
  cols: number
  rows: number
}

export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>({
    cols: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  })

  useEffect(() => {
    const onResize = () => setSize({ cols: process.stdout.columns, rows: process.stdout.rows })
    process.stdout.on('resize', onResize)
    return () => {
      process.stdout.off('resize', onResize)
    }
  }, [])

  return size
}
