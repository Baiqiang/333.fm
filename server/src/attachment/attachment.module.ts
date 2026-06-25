import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Attachments } from '@/entities/attachment.entity'

import { AttachmentController } from './attachment.controller'
import { AttachmentService } from './attachment.service'

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Attachments])],
  controllers: [AttachmentController],
  providers: [AttachmentService],
  exports: [AttachmentService],
})
export class AttachmentModule {}
