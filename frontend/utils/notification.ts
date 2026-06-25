import type { SubmissionComment } from './comment'
import type { Competition, Scramble, Submission } from './competition'
import type { User } from './user'

export enum NotificationType {
  COMMENT = 'comment',
  REPLY = 'reply',
  MENTION = 'mention',
  LIKE = 'like',
  FAVORITE = 'favorite',
}

export interface AppNotification {
  id: number
  type: NotificationType
  userId: number
  sourceUserId: number
  submissionId: number
  commentId: number
  read: boolean
  createdAt: string
  sourceUser: User
  submission: Submission & {
    competition: Competition
    scramble: Scramble
  }
  comment: SubmissionComment
}

export interface NotificationListResponse {
  items: AppNotification[]
  total: number
}
