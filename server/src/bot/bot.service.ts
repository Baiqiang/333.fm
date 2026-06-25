import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { randomBytes } from 'crypto'
import { Repository } from 'typeorm'

import { BotTokens, TokenStatus } from '@/entities/bot-tokens.entity'

@Injectable()
export class BotService {
  constructor(
    @InjectRepository(BotTokens)
    private readonly botTokensRepository: Repository<BotTokens>,
    private readonly configService: ConfigService,
  ) {}

  async bind(token: string) {
    const botToken = await this.botTokensRepository.findOne({
      where: {
        token,
        status: TokenStatus.Active,
      },
      relations: {
        user: true,
      },
    })
    if (!botToken) {
      throw new NotFoundException('Invalid token')
    }
    botToken.status = TokenStatus.Revoked
    await this.botTokensRepository.save(botToken)
    return botToken.user
  }

  async getOrGenerateToken(user: any) {
    let botToken = await this.botTokensRepository.findOne({
      where: {
        user,
        status: TokenStatus.Active,
      },
    })
    if (!botToken) {
      botToken = new BotTokens()
      botToken.user = user
      botToken.token = `token-${user.wcaId || user.id}-${randomBytes(16).toString('hex')}`
      botToken.status = TokenStatus.Active
      await this.botTokensRepository.save(botToken)
    }
    return botToken.token
  }
}
