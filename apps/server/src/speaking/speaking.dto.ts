import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class TargetWordDto {
  @IsString() @IsNotEmpty() id!: string;
  @IsString() @IsNotEmpty() word!: string;
  @IsString() meaningKo!: string;
}

export class CreateCustomScenarioDto {
  @IsString() @IsNotEmpty() @MaxLength(200) text!: string;
  @IsInt() @Min(1) @Max(5) level!: number;
}

export class StartSpeakingSessionDto {
  @IsString() @IsNotEmpty() scenarioId!: string;
  @IsString() @IsNotEmpty() cefr!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TargetWordDto) targetWords?: TargetWordDto[];
}

export class SpeakingTurnDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) text!: string;
}

export class RepeatCheckDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) reference!: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) text!: string;
}

export class SavePhraseDto {
  @IsString() @IsNotEmpty() @MaxLength(200) phrase!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) meaningKo!: string;
}
