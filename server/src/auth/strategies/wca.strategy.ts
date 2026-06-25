import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { Strategy } from 'passport-oauth2'
import { firstValueFrom } from 'rxjs'

import { UserService } from '@/user/user.service'

import { AuthService } from '../auth.service'

export interface WCAProfile {
  id: number
  wca_id: string
  name: string
  email: string
  avatar: Avatar
}

export interface Country {
  id: string
  name: string
  continentId: string
  iso2: string
}

export interface Avatar {
  url: string
  pending_url: string
  thumb_url: string
  is_default: boolean
}

@Injectable()
export class WCAStrategy extends PassportStrategy(Strategy, 'wca') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly userService: UserService,
  ) {
    const wca = configService.get('oauth.wca')
    super({
      authorizationURL: wca.authorizationURL,
      tokenURL: wca.tokenURL,
      clientID: wca.clientID,
      clientSecret: wca.clientSecret,
      callbackURL: wca.callbackURL,
    })
  }

  authenticate(req: Request, options?: any) {
    // set callbackURL for local development
    const mode: string = req.query.mode ?? req.body.mode
    if (mode === 'localhost') {
      options = {
        ...(options ?? {}),
        callbackURL: 'http://localhost:3000/auth/callback',
      }
    }
    return super.authenticate(req, options)
  }

  async userProfile(accessToken: string, done: (err?: Error, profile?: WCAProfile) => void) {
    const { data }: { data: { me: WCAProfile } } = await firstValueFrom(
      this.httpService.get(this.configService.get('oauth.wca.profileURL'), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    )
    done(null, data.me)
  }

  async validate(_: string, __: string, profile: WCAProfile) {
    return this.userService.findOrCreate(profile)
  }
}
