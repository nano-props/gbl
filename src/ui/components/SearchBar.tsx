import React from 'react'
import { Text, Box, useInput } from 'ink'
import { useAppStore } from '@/store/useAppStore.ts'

export function SearchBar() {
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const toggleSearch = useAppStore((s) => s.toggleSearch)

  useInput((input, key) => {
    if (key.escape) {
      setSearchQuery('')
      toggleSearch()
      return
    }
    if (key.backspace || key.delete) {
      setSearchQuery(searchQuery.slice(0, -1))
      return
    }
    if (input && !key.ctrl && !key.meta && !key.return) {
      setSearchQuery(searchQuery + input)
    }
  })

  return (
    <Box>
      <Text color="yellow" bold>
        /{' '}
      </Text>
      <Text color="green">{searchQuery}</Text>
      <Text backgroundColor="white"> </Text>
      {!searchQuery && <Text dimColor> type to filter branches...</Text>}
    </Box>
  )
}
