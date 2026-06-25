import { Test, TestingModule } from '@nestjs/testing'

import { IfController } from './if.controller'

describe('IfController', () => {
  let controller: IfController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IfController],
    }).compile()

    controller = module.get<IfController>(IfController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
