// src/Modules/Ques/Que.ts
import { ContainerInstance, Inject, Service, Token, Container } from 'typedi';
import { Queue as BullMQQueue, Worker, QueueEvents } from 'bullmq';
import { logger } from '../../Library/Logger';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';

@Service()
export class Queue<T> {
  public container: ContainerInstance;

  public queueToken: Token<BullMQQueue<T>>;

  public get queueEvents(): QueueEvents {
    return new QueueEvents(this.queue.name, {
      connection: {
        host: this.options.redis.hostname,
      },
    });
  }

  public constructor(
    @Inject(serverOptionsToken) private options: ServerOptions,
  ) {
    logger.info(`Queue.constructor() ${JSON.stringify(options)}`);

    this.container = Container.of(options.serverId);
  }

  public get queue(): BullMQQueue<T> {
    return this.container.get(this.queueToken);
  }

  public createQueue(queName: string): void {
    logger.info(`Que.createQueue(${queName})`);

    this.queueToken = new Token<BullMQQueue<T>>(`bullMQQue-${queName}`);

    const queue = new BullMQQueue<T>(queName, {
      connection: {
        host: this.options.redis.hostname,
      },
    });

    this.container.set(this.queueToken, queue);
  }

  public async createWorker(workerFile: string): Promise<Worker<T>> {
    const queue = this.queue;

    logger.info(`Queue.createWorker(${workerFile})`);

    worker.on('data', (...args) => {
      console.log('Worker Data: ', ...args);
    });

    return worker;
  }
}
