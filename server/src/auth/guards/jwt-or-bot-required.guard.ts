import { Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtOrBotRequiredGuard extends AuthGuard(['jwt', 'bot']) {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException()
    }
    return user
  }
}
