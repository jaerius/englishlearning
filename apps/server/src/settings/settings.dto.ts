import { Equals, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
export class ResetSettingsDto { @IsString() @Equals('RESET') confirmation!: string; }
export class UpdateSettingsDto {
  @IsOptional() @IsInt() @IsIn([5,10,15,20]) dailyNewCount?: number;
  @IsOptional() @IsInt() @IsIn([20,30,50]) reviewCap?: number;
  @IsOptional() @IsInt() @Min(1) @Max(6) userLevel?: number;
  @IsOptional() @IsBoolean() soundOn?: boolean;
  @IsOptional() @IsIn([0.8,1]) ttsRate?: 0.8|1;
  @IsOptional() @IsBoolean() ttsAutoplay?: boolean;
  @IsOptional() @IsBoolean() speakAutoSend?: boolean;
  @IsOptional() @IsBoolean() useTargetWords?: boolean;
}
