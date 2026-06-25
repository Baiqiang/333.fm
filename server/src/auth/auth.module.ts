import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { UserModule } from '@/user/user.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { BotStrategy } from './strategies/bot.strategy'
import { JwtStrategy } from './strategies/jwt.strategy'
import { WCAStrategy } from './strategies/wca.strategy'

@Module({
  imports: [
    UserModule,
    HttpModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: '30 days' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, WCAStrategy, JwtStrategy, BotStrategy],
  exports: [AuthService],
})
export class AuthModule {}
