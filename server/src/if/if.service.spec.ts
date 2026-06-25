import { Test, TestingModule } from '@nestjs/testing'

import { IfService } from './if.service'

describe('IfService', () => {
  let service: IfService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IfService],
    }).compile()

    service = module.get<IfService>(IfService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
