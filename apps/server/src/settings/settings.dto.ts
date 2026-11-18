import { Equals, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { dailyNewCounts, reviewCaps } from '../common/seed.js';
export class ResetSettingsDto { @IsString() @Equals('RESET') confirmation!: string; }
export class UpdateSettingsDto {
  @IsOptional() @IsInt() @IsIn(dailyNewCounts) dailyNewCount?: number;
  @IsOptional() @IsInt() @IsIn(reviewCaps) reviewCap?: number;
  @IsOptional() @IsInt() @Min(1) @Max(6) userLevel?: number;
  @IsOptional() @IsBoolean() soundOn?: boolean;
  @IsOptional() @IsIn([0.8,1]) ttsRate?: 0.8|1;
  @IsOptional() @IsBoolean() ttsAutoplay?: boolean;
  @IsOptional() @IsBoolean() speakAutoSend?: boolean;
  @IsOptional() @IsBoolean() useTargetWords?: boolean;
}
