import { CanActivate, Injectable } from '@nestjs/common'

@Injectable()
export class DevGuard implements CanActivate {
  canActivate(): boolean {
    return process.env.ENV !== 'production'
  }
}
