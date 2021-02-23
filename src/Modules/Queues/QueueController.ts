// src/Modules/Ques/QueueController.ts
import type { QueueOptions as BullMQQueueOptions } from 'bullmq';
import { ClassConstructor } from 'class-transformer';
import { Inject, Service } from 'typedi';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';
import { Queue } from './Queue';
import { QueueOptions } from './QueueOptions';

@Service()
export class QueueController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  /**
   * Create the IORedis Options
   */
  private createBullOptions(): BullMQQueueOptions {
    return {
      connection: {
        ...this.options.redis,
      },
    };
  }

  /**
   * Create a new Queue
   * @param queKey Queue key
   */
  public createQueue<QueueName extends string, T1>(
    input: Omit<
      QueueOptions<QueueName, ClassConstructor<T1>>,
      'bullOptions' | 'serverOptions'
    >,
  ): Queue<QueueName, T1> {
    const bullOptions = this.createBullOptions();

    return new Queue({
      ...input,
      bullOptions,
      serverOptions: this.options,
    });
  }
}
