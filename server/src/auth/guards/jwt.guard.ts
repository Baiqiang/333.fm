import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // if headers is not present, pass it through
    if (!context.switchToHttp().getRequest().headers.authorization) {
      return true
    }
    return super.canActivate(context)
  }
}
