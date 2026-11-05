import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { WordsService } from './words.service.js';

@Controller('words')
export class WordsController {
  constructor(private readonly service: WordsService) {}
  @Get() list(@Query('level', new ParseIntPipe({ optional: true })) level?: number) { return this.service.list(level); }
  @Get('search') search(@Query('q') q?: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string, @Query('level') level?: string, @Query('domain') domain?: string) {
    return this.service.search(q, cursor, limit, level, domain);
  }
  @Get(':id') one(@Param('id') id: string) { return this.service.one(id); }
}
