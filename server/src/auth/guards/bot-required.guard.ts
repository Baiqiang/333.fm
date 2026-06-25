import { Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class BotRequiredGuard extends AuthGuard('bot') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException()
    }
    return user
  }
}
