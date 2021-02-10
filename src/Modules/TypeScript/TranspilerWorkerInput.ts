// src/Modules/TypeScript/TranspilerWorkerInput.ts
import { Type } from 'class-transformer';
import { ValidateNested, IsString } from 'class-validator';
import { RedisOptions } from '../Redis/RedisOptions';

export class TranspilerWorkerInput {
  @ValidateNested()
  @Type(() => RedisOptions)
  public redisOptions: RedisOptions;

  /**
   * Name of the TypeScript Transpiler Que for this worker
   */
  @IsString()
  public queName: string;
}
