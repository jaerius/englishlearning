import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service.js';

@Controller('stats')
export class StatsController {
  constructor(private readonly service: StatsService) {}
  @Get('summary') summary() { return this.service.summary(); }
  @Get('weekly') weekly() { return this.service.weekly(); }
  @Get('coach') coach() { return this.service.coach(); }
  @Get('cost') cost() { return this.service.cost(); }
}
