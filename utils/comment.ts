import { type User, localeName } from './user'

export interface SubmissionComment {
  id: number
  content: string
  submissionId: number
  userId: number
  replyToId: number | null
  createdAt: string
  updatedAt: string
  user: User
  replyTo: SubmissionComment | null
  mentions: User[]
}

export interface CommentListResponse {
  items: SubmissionComment[]
  total: number
}

export function renderMentions(content: string, mentions?: User[], locale?: string): string {
  if (!mentions?.length)
    return content
  return content.replace(/@\[(\d+)\]/g, (_match, id) => {
    const user = mentions.find(u => u.id === parseInt(id, 10))
    if (!user)
      return _match
    const name = locale ? localeName(user.name, locale) : user.name
    return `@${name}`
  })
}

export interface MentionSegment {
  type: 'text' | 'mention'
  text: string
  user?: User
}

export function parseContentSegments(content: string, mentions?: User[]): MentionSegment[] {
  if (!mentions?.length)
    return [{ type: 'text', text: content }]

  const segments: MentionSegment[] = []
  let lastIndex = 0
  const regex = /@\[(\d+)\]/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex)
      segments.push({ type: 'text', text: content.substring(lastIndex, match.index) })

    const user = mentions.find(u => u.id === parseInt(match![1], 10))
    if (user)
      segments.push({ type: 'mention', text: user.name, user })
    else
      segments.push({ type: 'text', text: match[0] })

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length)
    segments.push({ type: 'text', text: content.substring(lastIndex) })

  return segments
}
