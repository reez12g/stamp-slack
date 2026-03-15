import { Controller, Get, Query, Render } from '@nestjs/common';
import { AppService } from '../providers/app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  getLandingPage(@Query('connected') connected?: string) {
    return this.appService.getLandingPage(connected === '1');
  }
}
