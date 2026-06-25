import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { Users } from '@/entities/users.entity'

import { AttachmentService } from './attachment.service'

@Controller('attachment')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('attachments'))
  @UseGuards(JwtRequiredGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        attachments: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiBearerAuth()
  async upload(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            // 20MB max
            maxSize: 20 * 1024 * 1024,
          }),
          new FileTypeValidator({
            // only allow images
            fileType: /image\/.*/,
          }),
        ],
      }),
    )
    files: Express.Multer.File[],
    @CurrentUser() user: Users,
  ) {
    return this.attachmentService.uploadFiles(files, user)
  }
}
