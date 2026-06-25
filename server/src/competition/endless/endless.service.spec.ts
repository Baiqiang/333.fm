import { Test, TestingModule } from '@nestjs/testing'

import { EndlessService } from './endless.service'

describe('EndlessService', () => {
  let service: EndlessService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EndlessService],
    }).compile()

    service = module.get<EndlessService>(EndlessService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
