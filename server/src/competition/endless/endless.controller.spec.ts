import { Test, TestingModule } from '@nestjs/testing'

import { EndlessController } from './endless.controller'

describe('EndlessController', () => {
  let controller: EndlessController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EndlessController],
    }).compile()

    controller = module.get<EndlessController>(EndlessController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
