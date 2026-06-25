import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Notifications } from '@/entities/notifications.entity'
import { Users } from '@/entities/users.entity'

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notifications)
    private readonly notificationsRepository: Repository<Notifications>,
  ) {}

  async getNotifications(user: Users, limit: number, offset: number) {
    const [items, total] = await this.notificationsRepository.findAndCount({
      where: { userId: user.id },
      relations: [
        'sourceUser',
        'submission',
        'submission.competition',
        'submission.scramble',
        'comment',
        'comment.mentions',
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    })
    return { items, total }
  }

  async getUnreadCount(user: Users) {
    return this.notificationsRepository.count({
      where: { userId: user.id, read: false },
    })
  }

  async markAsRead(user: Users, ids: number[]) {
    await this.notificationsRepository
      .createQueryBuilder()
      .update()
      .set({ read: true })
      .where('user_id = :userId AND id IN (:...ids)', { userId: user.id, ids })
      .execute()
  }

  async markAllAsRead(user: Users) {
    await this.notificationsRepository
      .createQueryBuilder()
      .update()
      .set({ read: true })
      .where('user_id = :userId AND read = false', { userId: user.id })
      .execute()
  }
}
