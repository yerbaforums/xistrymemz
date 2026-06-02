export type NotificationType =
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'NEW_MESSAGE'
  | 'MENTION'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'NEW_REQUEST'
  | 'PLAN_UPDATE'
  | 'SYSTEM'
  | 'NEW_FOLLOWER'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  read: boolean
  relatedId: string | null
  createdAt: string
}
