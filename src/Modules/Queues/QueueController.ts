// src/Modules/Ques/QueueController.ts
import { QueueOptions } from 'bullmq';
import { ClassConstructor } from 'class-transformer';
import { Inject, Service } from 'typedi';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';
import { Queue } from './Queue';

@Service()
export class QueueController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  /**
   * Create the IORedis Options
   */
  private createBullOptions(): QueueOptions {
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
    name: QueueName,
    inputClass: ClassConstructor<T1>,
    disableTermination?: boolean,
  ): Queue<QueueName, T1> {
    const bullOptions = this.createBullOptions();

    return new Queue({
      name,
      bullOptions,
      inputClass,
      disableTermination,
    });
  }
}
