import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Comments } from '@/entities/comments.entity'
import { Notifications } from '@/entities/notifications.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'

import { CommentController } from './comment.controller'
import { CommentService } from './comment.service'
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'

@Module({
  imports: [TypeOrmModule.forFeature([Comments, Notifications, Submissions, Users])],
  providers: [CommentService, NotificationService],
  controllers: [CommentController, NotificationController],
  exports: [CommentService, NotificationService],
})
export class CommentModule {}
