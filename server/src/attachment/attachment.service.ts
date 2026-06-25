import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { mkdir, writeFile } from 'fs/promises'
import { In, Repository } from 'typeorm'

import { Attachments } from '@/entities/attachment.entity'
import { Users } from '@/entities/users.entity'
import { calculateHash } from '@/utils'

@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(Attachments)
    private readonly attachmentRepository: Repository<Attachments>,
    private readonly configService: ConfigService,
  ) {}

  async findByIds(ids: number[]) {
    if (ids.length === 0) {
      return []
    }
    const attachments = await this.attachmentRepository.findBy({
      id: In(ids),
    })
    return attachments.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
  }

  async uploadFiles(files: Express.Multer.File[], user: Users) {
    return await Promise.all(files.map(file => this.upload(file, user)))
  }

  async upload(file: Express.Multer.File, user: Users) {
    const hash = calculateHash(file.buffer)
    const existingAttachment = await this.attachmentRepository.findOne({
      where: {
        hash,
        userId: user.id,
      },
    })
    if (existingAttachment) {
      return existingAttachment
    }
    const dest = this.configService.get<string>('upload.dest')
    const path = `${dest}/${hash.slice(0, 2)}/${hash.slice(2, 4)}`
    const name = Buffer.from(file.originalname, 'latin1').toString('utf-8')
    await mkdir(path, { recursive: true })
    await writeFile(`${path}/${hash}-${name}`, file.buffer)
    const attachment = this.attachmentRepository.create({
      hash,
      userId: user.id,
      type: file.mimetype,
      name,
    })
    await this.attachmentRepository.save(attachment)
    return attachment
  }
}
