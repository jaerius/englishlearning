import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCustomScenarioDto, RepeatCheckDto, SpeakingTurnDto, StartSpeakingSessionDto } from './speaking.dto.js';
import { SpeakingService } from './speaking.service.js';

@Controller('speaking')
export class SpeakingController {
  constructor(private readonly service: SpeakingService) {}
  @Get('scenarios') scenarios() { return this.service.scenarios(); }
  @Get('target-words') targetWords() { return this.service.targetWords(); }
  @Post('scenarios/custom') createCustom(@Body() body: CreateCustomScenarioDto) { return this.service.createCustom(body); }
  @Post('sessions') start(@Body() body: StartSpeakingSessionDto) { return this.service.start(body); }
  @Post('sessions/:id/turn') turn(@Param('id') id: string, @Body() body: SpeakingTurnDto) { return this.service.turn(id, body); }
  @Post('sessions/:id/transcribe')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async transcribe(@Param('id') id: string, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
    if (!file) throw new BadRequestException({ code: 'AUDIO_REQUIRED', message: '녹음 파일이 없습니다.' });
    const text = await this.service.transcribe(id, file.buffer, file.mimetype);
    return { text, sessionId: id };
  }
  @Delete('sessions/:id/turns/last') deleteLast(@Param('id') id: string) { return this.service.deleteLastTurn(id); }
  @Post('sessions/:id/finish') finish(@Param('id') id: string) { return this.service.finish(id); }
  @Post('repeat-check') repeatCheck(@Body() body: RepeatCheckDto) { return this.service.repeatCheck(body); }
}
