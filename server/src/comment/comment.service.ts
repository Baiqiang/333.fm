import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import { CreateCommentDto } from '@/dtos/create-comment.dto'
import { Comments } from '@/entities/comments.entity'
import { Notifications, NotificationType } from '@/entities/notifications.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comments)
    private readonly commentsRepository: Repository<Comments>,
    @InjectRepository(Notifications)
    private readonly notificationsRepository: Repository<Notifications>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async getComments(submissionId: number, limit: number, offset: number) {
    const [items, total] = await this.commentsRepository.findAndCount({
      where: { submissionId },
      relations: ['user', 'replyTo', 'replyTo.user', 'replyTo.mentions', 'mentions'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    })
    return { items: items.reverse(), total }
  }

  async getCommentCount(submissionId: number) {
    return this.commentsRepository.count({ where: { submissionId } })
  }

  async getCommentCounts(submissionIds: number[]) {
    if (submissionIds.length === 0) return {}
    const results = await this.commentsRepository
      .createQueryBuilder('c')
      .select('c.submission_id', 'submissionId')
      .addSelect('COUNT(*)', 'count')
      .where('c.submission_id IN (:...ids)', { ids: submissionIds })
      .groupBy('c.submission_id')
      .getRawMany()
    const map: Record<number, number> = {}
    for (const row of results) map[row.submissionId] = parseInt(row.count, 10)
    return map
  }

  async create(user: Users, dto: CreateCommentDto) {
    if (!dto.submissionId) {
      throw new BadRequestException('submissionId is required')
    }

    const targetSubmission = await this.submissionsRepository.findOne({
      where: { id: dto.submissionId },
      relations: ['user'],
    })
    if (!targetSubmission) throw new NotFoundException('Submission not found')
    const ownerUserId = targetSubmission.userId

    let replyTo: Comments | null = null
    if (dto.replyToId) {
      replyTo = await this.commentsRepository.findOne({
        where: { id: dto.replyToId, submissionId: dto.submissionId },
        relations: ['user'],
      })
      if (!replyTo) throw new NotFoundException('Reply target not found')
    }

    const comment = new Comments()
    comment.content = dto.content
    comment.submissionId = dto.submissionId
    comment.userId = user.id
    comment.user = user
    if (replyTo) {
      comment.replyToId = replyTo.id
      comment.replyTo = replyTo
    }

    let mentionUsers: Users[] = []
    if (dto.mentionUserIds?.length) {
      mentionUsers = await this.usersRepository.find({
        where: { id: In(dto.mentionUserIds) },
      })
      comment.mentions = mentionUsers
    }

    await this.commentsRepository.save(comment)

    await this.createNotifications(user, ownerUserId, comment, replyTo, mentionUsers, dto.submissionId)

    return this.commentsRepository.findOne({
      where: { id: comment.id },
      relations: ['user', 'replyTo', 'replyTo.user', 'replyTo.mentions', 'mentions'],
    })
  }

  async delete(user: Users, commentId: number) {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, userId: user.id },
    })
    if (!comment) throw new NotFoundException('Comment not found')

    await this.commentsRepository.remove(comment)
  }

  private async createNotifications(
    sourceUser: Users,
    ownerUserId: number,
    comment: Comments,
    replyTo: Comments | null,
    mentionUsers: Users[],
    submissionId: number,
  ) {
    const notifications: Notifications[] = []
    const notifiedUserIds = new Set<number>()

    notifiedUserIds.add(sourceUser.id)

    if (!notifiedUserIds.has(ownerUserId)) {
      const notification = new Notifications()
      notification.type = NotificationType.COMMENT
      notification.userId = ownerUserId
      notification.sourceUserId = sourceUser.id
      notification.submissionId = submissionId
      notification.commentId = comment.id
      notifications.push(notification)
      notifiedUserIds.add(ownerUserId)
    }

    if (replyTo && !notifiedUserIds.has(replyTo.userId)) {
      const notification = new Notifications()
      notification.type = NotificationType.REPLY
      notification.userId = replyTo.userId
      notification.sourceUserId = sourceUser.id
      notification.submissionId = submissionId
      notification.commentId = comment.id
      notifications.push(notification)
      notifiedUserIds.add(replyTo.userId)
    }

    for (const mentionUser of mentionUsers) {
      if (!notifiedUserIds.has(mentionUser.id)) {
        const notification = new Notifications()
        notification.type = NotificationType.MENTION
        notification.userId = mentionUser.id
        notification.sourceUserId = sourceUser.id
        notification.submissionId = submissionId
        notification.commentId = comment.id
        notifications.push(notification)
        notifiedUserIds.add(mentionUser.id)
      }
    }

    if (notifications.length > 0) await this.notificationsRepository.save(notifications)
  }

  async searchUsers(query: string, limit = 10) {
    return this.usersRepository
      .createQueryBuilder('u')
      .where('u.source != :merged', { merged: 'MERGED' })
      .andWhere('(u.name LIKE :query OR u.wca_id LIKE :query)', { query: `%${query}%` })
      .orderBy('u.name', 'ASC')
      .take(limit)
      .getMany()
  }
}
