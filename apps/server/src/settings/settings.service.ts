import { Injectable } from '@nestjs/common';
import { StoreService } from '../common/store.service.js';
import { UpdateSettingsDto } from './settings.dto.js';
import { emptyDatabase } from '../common/seed.js';
import type { SpeakingData } from '../speaking/speaking.models.js';
@Injectable() export class SettingsService { constructor(private readonly store: StoreService) {} get() { return this.store.snapshot().settings; } update(input: UpdateSettingsDto) { return this.store.update(db => Object.assign(db.settings, input)); } reset() { return this.store.update(db => { const fresh = emptyDatabase(); Object.assign(db, fresh); (db as typeof db & SpeakingData).speakingScenarios = []; (db as typeof db & SpeakingData).speakingSessions = []; return { reset: true }; }); } }
