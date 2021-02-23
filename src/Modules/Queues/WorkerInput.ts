// src/Modules/TypeScript/WorkerInput.ts
import type { QueueOptions } from 'bullmq';
import { plainToClass, Transform } from 'class-transformer';
import { IsInt, IsString, validateOrReject } from 'class-validator';
import { Token } from 'typedi';
import { logger } from '../../Library/Logger';
import { ServerOptions } from '../Server/ServerOptions';

export class WorkerInput {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      logger.silly(`WorkerInput.serverOptions is string`, {
        value,
      });

      return JSON.parse(value) as ServerOptions;
    }

    return JSON.stringify(value);
  })
  public serverOptions: ServerOptions;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      logger.silly(`WorkerInput.queueOptions is string`, {
        value,
      });

      return JSON.parse(value) as QueueOptions;
    }

    return JSON.stringify(value);
  })
  public queueOptions: QueueOptions;

  @IsString()
  public workerPath: string;

  /**
   * Name of the TypeScript Transpiler Que for this worker
   */
  @IsString()
  public queName: string;

  /**
   * Number of workers spawned
   */
  @IsInt()
  @Transform(({ value }) => {
    if (typeof value === 'number') {
      return `${value}`;
    }

    return parseInt(value);
  })
  public workerCount: number;

  public static async createWorkerInput(
    inputParams: Partial<WorkerInput>,
  ): Promise<WorkerInput> {
    const jobInput = plainToClass(WorkerInput, inputParams);
    await validateOrReject(jobInput);

    return jobInput;
  }
}

export const workerInputToken = new Token<WorkerInput>('workerInput');
