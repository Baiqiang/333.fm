import { Test, TestingModule } from '@nestjs/testing'

import { DailyController } from './daily.controller'

describe('DailyController', () => {
  let controller: DailyController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyController],
    }).compile()

    controller = module.get<DailyController>(DailyController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
