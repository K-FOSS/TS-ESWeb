/* eslint-disable @typescript-eslint/no-floating-promises */
// src/Modules/Redis/RedisController.ts
import { plainToClass } from 'class-transformer';
import {
  isNumberString,
  isString,
  IsString,
  validateOrReject,
} from 'class-validator';
import IORedis from 'ioredis';
import { logger } from '../../Library/Logger';
import { RedisType } from './RedisTypes';

export class SetValueInput {
  @IsString()
  public key: string;

  @IsString({
    each: true,
  })
  public value: string | string[];
}

export class RedisController {
  /**
   * Redis Instance
   */
  public IORedis: IORedis.Redis;

  private async clearRedis(): Promise<Array<[Error | null, unknown]>> {
    logger.debug('Cleaning up redis');

    const pipeline = this.IORedis.pipeline();

    for (const redisTypeKey in RedisType) {
      if (isNumberString(redisTypeKey) === false) {
        const redisKeyPrefix = this.getRedisKeyPrefix(
          RedisType[redisTypeKey as keyof typeof RedisType],
        );

        logger.debug(`redisKeyPrefix: `, {
          redisKeyPrefix,
        });

        const redisKeys = await this.IORedis.keys(`${redisKeyPrefix}-*`);

        for (const redisKey of redisKeys) {
          pipeline.del(redisKey);
        }
      }
    }

    return pipeline.exec();
  }

  public constructor(options: IORedis.RedisOptions) {
    this.IORedis = new IORedis(options);

    process.on('exit', () => {
      // Do some cleanup such as close db
      this.clearRedis();
    });

    // catching signals and do something before exit
    [
      'SIGHUP',
      'SIGINT',
      'SIGQUIT',
      'SIGILL',
      'SIGTRAP',
      'SIGABRT',
      'SIGBUS',
      'SIGFPE',
      'SIGUSR1',
      'SIGSEGV',
      'SIGUSR2',
      'SIGTERM',
    ].forEach(function (sig) {
      process.on(sig, function () {
        terminator(sig);
        console.log('signal: ' + sig);
      });
    });

    const terminator = async (sig: string | number): Promise<void> => {
      if (typeof sig === 'string') {
        // call your async task here and then call process.exit() after async task is done
        await this.clearRedis();
      }
    };
  }

  private getRedisKeyPrefix(type: RedisType): string {
    switch (type) {
      case RedisType.MODULE:
        return 'module';
      case RedisType.MODULE_MAP:
        return 'moduleMap';
    }
  }

  public getRedisKey(type: RedisType, key: string): string {
    return `${this.getRedisKeyPrefix(type)}-${key}`;
  }

  /**
   * Set a value in Redis
   * @param type Redis DB Type
   * @param input Input
   */
  public async setValue(
    type: RedisType,
    inputObj: SetValueInput,
  ): Promise<void> {
    const input = plainToClass(SetValueInput, inputObj);
    await validateOrReject(input);

    await this.IORedis.set(this.getRedisKey(type, input.key), input.value);
  }

  /**
   * Get a value for a type and key in Redis
   */
  public async getValue(type: RedisType, key: string): Promise<string | null> {
    const value = await this.IORedis.get(this.getRedisKey(type, key));

    return value;
  }

  public async getValueOrThrow(type: RedisType, key: string): Promise<string> {
    const value = await this.getValue(type, key);

    if (isString(value)) {
      return value;
    }

    logger.error(
      `RedisController.getValue(${type}, ${key}) returned value is invalid`,
    );
    throw new Error(`Invalid value from Redis for key ${key}`);
  }
}
