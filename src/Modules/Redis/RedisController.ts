// src/Modules/Redis/RedisController.ts
import IORedis from 'ioredis';
import { Inject, Service } from 'typedi';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';

@Service()
export class RedisController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  /**
   * Redis Instance
   */
  public IORedis: IORedis.Redis;

  public constructor(options: IORedis.RedisOptions) {
    this.IORedis = new IORedis(options);
  }
}
