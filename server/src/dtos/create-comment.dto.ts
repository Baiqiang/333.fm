import { IsArray, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCommentDto {
  @IsOptional()
  @IsInt()
  submissionId?: number

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  content: string

  @IsOptional()
  @IsInt()
  replyToId?: number

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  mentionUserIds?: number[]
}
