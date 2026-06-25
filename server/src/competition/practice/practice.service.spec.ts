import { Test, TestingModule } from '@nestjs/testing'

import { PracticeService } from './practice.service'

describe('PracticeService', () => {
  let service: PracticeService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PracticeService],
    }).compile()

    service = module.get<PracticeService>(PracticeService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
