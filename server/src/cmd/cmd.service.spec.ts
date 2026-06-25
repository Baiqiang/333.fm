import { Test, TestingModule } from '@nestjs/testing'

import { CmdService } from './cmd.service'

describe('CmdService', () => {
  let service: CmdService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CmdService],
    }).compile()

    service = module.get<CmdService>(CmdService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
