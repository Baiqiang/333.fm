import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { UserService } from '@/user/user.service'

@Injectable()
export class BotStrategy extends PassportStrategy(Strategy, 'bot') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('bot.secret'),
    })
  }

  validate(payload: { wcaId: string }) {
    return this.userService.findOne(payload.wcaId)
  }
}
