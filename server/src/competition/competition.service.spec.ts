import { Test, TestingModule } from '@nestjs/testing'

import { CompetitionService } from './competition.service'

describe('CompetitionService', () => {
  let service: CompetitionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompetitionService],
    }).compile()

    service = module.get<CompetitionService>(CompetitionService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
