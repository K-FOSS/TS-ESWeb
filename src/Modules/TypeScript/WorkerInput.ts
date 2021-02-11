// src/Modules/TypeScript/WorkerInput.ts
import type { QueueOptions } from 'bullmq';
import { Type } from 'class-transformer';
import { IsString } from 'class-validator';
import { RedisOptions } from '../Redis/RedisOptions';

export class WorkerInput {
  @Type(() => RedisOptions)
  public redisOptions: QueueOptions;

  /**
   * Name of the TypeScript Transpiler Que for this worker
   */
  @IsString()
  public queName: string;
}
