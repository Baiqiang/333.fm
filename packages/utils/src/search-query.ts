export interface SearchTerm {
  value: string
  exact: boolean
}

/**
 * Parse a search query with optional double-quoted exact phrases.
 * Without quotes the whole query is one term.
 * With quotes, quoted segments are exact phrases; remaining text is split by whitespace.
 */
export function parseSearchQuery(query: string): SearchTerm[] {
  const trimmed = query.trim()
  if (!trimmed)
    return []

  if (!trimmed.includes('"'))
    return [{ value: trimmed, exact: false }]

  const terms: SearchTerm[] = []
  const regex = /"([^"]*)"|(\S+)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(trimmed)) !== null) {
    if (match[1] !== undefined) {
      if (match[1])
        terms.push({ value: match[1], exact: true })
    }
    else if (match[2]) {
      terms.push({ value: match[2], exact: false })
    }
  }

  return terms
}
