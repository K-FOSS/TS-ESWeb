// src/Modules/TypeScript/WorkerInput.ts
import type { QueueOptions } from 'bullmq';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { logger } from '../../Library/Logger';

export class WorkerInput {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      logger.debug(`WorkerInput.queueOptions is string`, {
        value,
      });

      return JSON.parse(value) as QueueOptions;
    }

    return JSON.stringify(value);
  })
  public queueOptions: QueueOptions;

  /**
   * Name of the TypeScript Transpiler Que for this worker
   */
  @IsString()
  public queName: string;
}
