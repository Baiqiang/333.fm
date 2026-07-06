import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'

import { Users } from '@/entities/users.entity'

@Injectable()
export class FunChallengeAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user?: Users }>()
    if (user?.id !== 1) {
      throw new ForbiddenException()
    }
    return true
  }
}
