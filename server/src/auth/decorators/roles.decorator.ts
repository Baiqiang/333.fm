import { SetMetadata } from '@nestjs/common'

import { UserRoles } from '@/entities/user-roles.entity'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: UserRoles[] | string[]) => SetMetadata(ROLES_KEY, roles)
