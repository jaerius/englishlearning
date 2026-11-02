import { Module } from '@nestjs/common';
import { SpeakingController } from './speaking.controller.js';
import { SpeakingProvider } from './speaking.provider.js';
import { SpeakingService } from './speaking.service.js';

@Module({ controllers: [SpeakingController], providers: [SpeakingProvider, SpeakingService] })
export class SpeakingModule {}
