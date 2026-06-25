import { Test, TestingModule } from '@nestjs/testing'

import { PracticeController } from './practice.controller'

describe('PracticeController', () => {
  let controller: PracticeController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PracticeController],
    }).compile()

    controller = module.get<PracticeController>(PracticeController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
