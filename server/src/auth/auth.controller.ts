import { Controller, Get, UseGuards } from '@nestjs/common'

import { Users } from '@/entities/users.entity'

import { AuthService } from './auth.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { JwtAuthGuard } from './guards/jwt.guard'
import { WCAOauthGuard } from './guards/wca.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('callback')
  @UseGuards(WCAOauthGuard)
  public async callback(@CurrentUser() user: Users) {
    return this.authService.wcaSignIn(user)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  public async me(@CurrentUser() user: Users) {
    return user ?? null
  }
}
