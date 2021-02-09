// src/Modules/Ques/Que.ts

import { ContainerInstance, Inject, Service, Token, Container } from 'typedi';
import { Queue as BullMQQueue } from 'bullmq';
import { logger } from '../../Library/Logger';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';

@Service()
export class Queue {
  public container: ContainerInstance;

  public constructor(
    @Inject(serverOptionsToken) private options: ServerOptions,
  ) {
    logger.info(`Queue.constructor() ${JSON.stringify(options)}`);

    this.container = Container.of(options.serverId);
  }

  public async createQueue(queName: string): Promise<BullMQQueue> {
    logger.info(`Que.createQueue(${queName})`);

    return new BullMQQueue(queName, {
      connection: {
        host: this.options.redis.hostname,
      },
    });
  }
}
