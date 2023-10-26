import type { InsertionFinder } from './if'

export interface User {
  id: number
  wcaId: string
  name: string
  email: string
  avatar: string
  avatarThumb: string
  roles: Role[]
}

export interface Role {
  id: number
  name: string
}

export interface UserIF extends InsertionFinder {
  name: string
}

export function hasRole(user: User, role: Role): boolean {
  return user.roles.some(r => r.name === role.name)
}
