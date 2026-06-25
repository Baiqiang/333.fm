import { Body, Controller, Get, Logger, Post } from '@nestjs/common'

import { AppService } from './app.service'

@Controller()
export class AppController {
  private logger = new Logger('AppController')

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Post('report')
  report(@Body() body: any): string {
    this.logger.log(body)
    return 'report'
  }
}
