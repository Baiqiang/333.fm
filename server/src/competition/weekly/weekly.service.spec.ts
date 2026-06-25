import { Test, TestingModule } from '@nestjs/testing'

import { WeeklyService } from './weekly.service'

describe('WeeklyService', () => {
  let service: WeeklyService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeeklyService],
    }).compile()

    service = module.get<WeeklyService>(WeeklyService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
