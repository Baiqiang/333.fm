import { Type } from 'class-transformer'
import { IsArray, IsInt, IsString, MaxLength, ValidateNested } from 'class-validator'

export class SortTutorialItem {
  @IsInt()
  id: number

  @IsInt()
  sort: number

  @IsString()
  @MaxLength(100)
  category: string
}

export class SortTutorialDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortTutorialItem)
  items: SortTutorialItem[]
}
