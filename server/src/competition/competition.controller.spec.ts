import { Test, TestingModule } from '@nestjs/testing'

import { CompetitionController } from './competition.controller'

describe('CompetitionController', () => {
  let controller: CompetitionController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionController],
    }).compile()

    controller = module.get<CompetitionController>(CompetitionController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
