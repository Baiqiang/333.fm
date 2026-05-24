import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { isInt } from 'class-validator'

import { CurrentUser } from '@/auth/decorators/current-user.decorator'
import { BannedGuard } from '@/auth/guards/banned.guard'
import { JwtAuthGuard } from '@/auth/guards/jwt.guard'
import { JwtRequiredGuard } from '@/auth/guards/jwt-required.guard'
import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import { SubmissionPhase, Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'

import { ChainService } from './chain.service'

@Controller('chain')
export class ChainController {
  constructor(
    private readonly chainService: ChainService,
    private readonly userService: UserService,
  ) {}

  @Get('')
  public async getOnGoing() {
    return this.chainService.get()
  }

  @Get(':number/stats')
  public async stats(@Param('number', ParseIntPipe) number: number) {
    const competition = await this.chainService.get()
    if (!competition) {
      throw new NotFoundException()
    }
    const scramble = competition.scrambles.find(s => s.number === number)
    if (!scramble) {
      throw new NotFoundException()
    }
    return this.chainService.getStats(competition, scramble)
  }

  // @Get(':number/:phase')
  // @UseGuards(JwtAuthGuard)
  // public async phase(
  //   @Param('number', ParseIntPipe) number: number,
  //   @Param('phase') phase: string,
  //   @CurrentUser() user: Users,
  // ) {
  //   if (!SubmissionPhase[phase]) {
  //     throw new NotFoundException()
  //   }
  //   const competition = await this.chainService.get()
  //   if (!competition) {
  //     throw new NotFoundException()
  //   }
  //   const scramble = competition.scrambles.find(s => s.number === number)
  //   if (!scramble) {
  //     throw new NotFoundException()
  //   }
  //   return this.chainService.getSubmissionsByPhase(competition, scramble, SubmissionPhase[phase], user)
  // }

  @Get([':number/submissions', ':number/:parentIdOrPhase/submissions'])
  @UseGuards(JwtAuthGuard)
  async submissions(
    @Param('number', ParseIntPipe) number: number,
    @Param('parentIdOrPhase') parentIdOrPhase: string,
    @CurrentUser() user: Users,
  ) {
    const competition = await this.chainService.get()
    if (!competition) {
      throw new NotFoundException()
    }
    const scramble = competition.scrambles.find(s => s.number === number)
    if (!scramble) {
      throw new NotFoundException()
    }
    let submissions: Submissions[]
    let parent: Submissions = null
    let phase: SubmissionPhase
    if (parentIdOrPhase) {
      const parsed = parseFloat(parentIdOrPhase)
      if (!Number.isNaN(parsed) && isInt(parsed)) {
        parent = await this.chainService.getSubmission(competition, scramble, parsed)
        if (!parent) {
          throw new NotFoundException()
        }
      } else {
        if (SubmissionPhase[parentIdOrPhase] === undefined) {
          throw new NotFoundException()
        }
        phase = SubmissionPhase[parentIdOrPhase]
      }
    }
    if (phase !== undefined) {
      submissions = await this.chainService.getSubmissionsByPhase(competition, scramble, phase, user)
    } else {
      submissions = await this.chainService.getSubmissions(competition, scramble, parent, user)
    }
    if (user) {
      await this.userService.loadUserActivities(user, submissions)
    }
    return submissions
  }

  @Get([':number', ':number/:id'])
  @UseGuards(JwtAuthGuard)
  async tree(
    @Param('number', ParseIntPipe) number: number,
    @Param('id', new DefaultValuePipe(0), ParseIntPipe) id: number,
    @CurrentUser() user: Users,
  ) {
    const competition = await this.chainService.get()
    if (!competition) {
      throw new NotFoundException()
    }
    const scramble = competition.scrambles.find(s => s.number === number)
    if (!scramble) {
      throw new NotFoundException()
    }
    if (!id) {
      return {
        scramble,
        tree: null,
      }
    }
    const submission = await this.chainService.getSubmission(competition, scramble, id)
    if (!submission) {
      throw new NotFoundException()
    }
    const tree = await this.chainService.getTree(submission)
    if (user) {
      await this.userService.act(user, submission.id, { view: true, notify: false })
      await this.userService.loadUserActivities(user, [tree])
    }
    return {
      scramble,
      tree,
    }
  }

  @Post('')
  @UseGuards(JwtRequiredGuard, BannedGuard)
  async submit(@CurrentUser() user: Users, @Body() solution: SubmitSolutionDto) {
    const competition = await this.chainService.get()
    if (!competition) {
      throw new NotFoundException()
    }
    return this.chainService.submitSolution(competition, user, solution)
  }
}
