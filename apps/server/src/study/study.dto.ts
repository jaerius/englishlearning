import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
export class CreateStudySessionDto { @IsIn(['daily','review']) kind!: 'daily'|'review'; @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({each:true}) wordIds?:string[]; }
export class SubmitAnswerDto { @IsString() sessionId!:string; @IsString() wordId!:string; @IsIn(['A','B','C','S']) quizType!:'A'|'B'|'C'|'S'; @IsBoolean() isCorrect!:boolean; @IsBoolean() hintUsed!:boolean; }
