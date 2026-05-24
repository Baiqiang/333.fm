import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'

import { Users } from '@/entities/users.entity'

import { Role } from '../enums/role.enum'

@Injectable()
export class BannedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: Users }>()
    if (user?.roles?.some(r => r.name === Role.Banned)) {
      throw new ForbiddenException('You have been banned from submitting.')
    }
    return true
  }
}
