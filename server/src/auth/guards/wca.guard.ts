import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class WCAOauthGuard extends AuthGuard('wca') {}
