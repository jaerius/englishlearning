import { Type } from 'class-transformer'; import { IsArray, IsInt, IsString, Max, Min, ValidateNested, ArrayMinSize, ArrayMaxSize, IsOptional } from 'class-validator';
export class LevelAnswerDto { @IsString() wordId!: string; @IsInt() @Min(1) @Max(5) level!: number; @IsOptional() @IsString() selectedMeaning!: string|null; }
export class SubmitLevelTestDto { @IsArray() @ArrayMinSize(20) @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>LevelAnswerDto) answers!: LevelAnswerDto[]; }
