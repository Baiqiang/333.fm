import { Test, TestingModule } from '@nestjs/testing'

import { DailyService } from './daily.service'

describe('DailyService', () => {
  let service: DailyService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyService],
    }).compile()

    service = module.get<DailyService>(DailyService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
