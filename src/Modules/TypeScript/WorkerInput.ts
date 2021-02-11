// src/Modules/TypeScript/WorkerInput.ts
import { Transform, Type } from 'class-transformer';
import { ValidateNested, IsString } from 'class-validator';
import { logger } from '../../Library/Logger';
import { RedisOptions } from '../Redis/RedisOptions';

export class WorkerInput {
  @ValidateNested()
  @Type(() => RedisOptions)
  @Transform((input) => {
    if (typeof input === 'string') {
      const parsedJSON = JSON.parse(input) as RedisOptions;

      logger.debug(
        `new WorkerInput().redisOptions typeof redisOptions === 'string'`,
        parsedJSON,
      );

      return parsedJSON;
    }

    return input;
  })
  public redisOptions: RedisOptions;

  /**
   * Name of the TypeScript Transpiler Que for this worker
   */
  @IsString()
  public queName: string;
}
