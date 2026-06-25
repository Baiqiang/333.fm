import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { Users } from '@/entities/users.entity'

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async wcaSignIn(user: Users) {
    const payload = { id: user.id, email: user.email }
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    }
  }
}
