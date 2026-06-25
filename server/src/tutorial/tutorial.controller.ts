import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'

import { Roles } from '@/auth/decorators/roles.decorator'
import { Role } from '@/auth/enums/role.enum'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'

import { CreateTutorialDto } from './dto/create-tutorial.dto'
import { SortTutorialDto } from './dto/sort-tutorial.dto'
import { UpdateTutorialDto } from './dto/update-tutorial.dto'
import { TutorialService } from './tutorial.service'

@Controller('tutorial')
export class TutorialController {
  constructor(private readonly tutorialService: TutorialService) {}

  @Get()
  findAll() {
    return this.tutorialService.findAll()
  }

  @Post()
  @UseGuards(JwtRequiredGuard, RolesGuard)
  @Roles(Role.Admin, Role.TutorialAdmin)
  @ApiBearerAuth()
  create(@Body() dto: CreateTutorialDto) {
    return this.tutorialService.create(dto)
  }

  @Put('sort')
  @UseGuards(JwtRequiredGuard, RolesGuard)
  @Roles(Role.Admin, Role.TutorialAdmin)
  @ApiBearerAuth()
  sort(@Body() dto: SortTutorialDto) {
    return this.tutorialService.batchSort(dto.items)
  }

  @Put(':id')
  @UseGuards(JwtRequiredGuard, RolesGuard)
  @Roles(Role.Admin, Role.TutorialAdmin)
  @ApiBearerAuth()
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTutorialDto) {
    const tutorial = await this.tutorialService.update(id, dto)
    if (!tutorial) throw new NotFoundException()
    return tutorial
  }

  @Delete(':id')
  @UseGuards(JwtRequiredGuard, RolesGuard)
  @Roles(Role.Admin, Role.TutorialAdmin)
  @ApiBearerAuth()
  async remove(@Param('id', ParseIntPipe) id: number) {
    const tutorial = await this.tutorialService.findOne(id)
    if (!tutorial) throw new NotFoundException()
    await this.tutorialService.remove(id)
  }
}
