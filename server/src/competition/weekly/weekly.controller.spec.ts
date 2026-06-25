import { Test, TestingModule } from '@nestjs/testing'

import { WeeklyController } from './weekly.controller'

describe('WeeklyController', () => {
  let controller: WeeklyController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeeklyController],
    }).compile()

    controller = module.get<WeeklyController>(WeeklyController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
