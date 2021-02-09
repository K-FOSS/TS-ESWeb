// src/Modules/Redis/RedisController.ts
import { Inject } from 'typedi';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';
import { Queue } from 'bullmq/src'

const queue = new Queue('');

queue.add('cars', { color: 'blue' });

export class RedisController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  public redis = 
}