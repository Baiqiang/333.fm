import { createParamDecorator, ExecutionContext } from '@nestjs/common'

import { Users } from '@/entities/users.entity'

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): Users => {
  return context.switchToHttp().getRequest().user as Users
})
