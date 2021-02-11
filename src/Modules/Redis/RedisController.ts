// src/Modules/Redis/RedisController.ts
import { Inject } from 'typedi';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';

export class RedisController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;
}
