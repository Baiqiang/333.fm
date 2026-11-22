export const SCRAMBLE_CUBE_MODES = ['always', 'finished', 'each'] as const

/**
 * - `always`: always show scramble images.
 * - `finished`: show them for ended or submitted competitions; others are revealed one by one.
 * - `each`: hide all; each scramble is revealed independently.
 */
export type ScrambleCubeMode = typeof SCRAMBLE_CUBE_MODES[number]

export interface UserPreferences {
  scrambleCubeMode?: ScrambleCubeMode
}

export interface User {
  id: number
  wcaId: string
  name: string
  email: string
  avatar: string
  avatarThumb: string
  roles: Role[]
  practices: number
  preferences?: UserPreferences
}

export interface AdminUser extends User {
  finders: number
}

export interface Role {
  id: number
  name: string
}

export function hasRole(user: User, role: Role): boolean {
  return user.roles.some(r => r.name === role.name)
}

export function localeName(name: string, locale: string): string {
  const matches = name.match(/^(.+?)\s*\((.+)\)$/)
  if (!matches)
    return name

  return locale === 'en' ? matches[1] : matches[2]
}

export function userId(user: User) {
  return user.wcaId || user.id
}

export const SYMBOL_USER: InjectionKey<Ref<User>> = Symbol('user')
