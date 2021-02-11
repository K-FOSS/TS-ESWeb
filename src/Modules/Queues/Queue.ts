// src/Modules/Queue/Queue.ts
import {
  Job,
  Queue as BullMQQueue,
  QueueEvents as BullMQQueueEvents,
} from 'bullmq';
import { Worker } from 'worker_threads';
import { spawnWorker } from '@k-foss/ts-worker';
import { cpus } from 'os';
import { logger } from '../../Library/Logger';
import { QueueOptions } from './QueueOptions';
import { ClassConstructor } from 'class-transformer';

/**
 * Task Queue handled by dedicated `worker_threads` created by
 * [`@K-FOSS/TS-ESWorkers`](https://www.npmjs.com/package/@k-foss/ts-worker)
 *
 * The Queue is handled by [`bullmq`](https://www.npmjs.com/package/bullmq) with
 * a Redis backend
 */
export class Queue<QueueName extends string, JobInput, JobOutput> {
  public queue: BullMQQueue<JobInput, unknown, QueueName>;
  public queueEvents: BullMQQueueEvents;

  public workers: Worker[] = [];

  public hasRun = false;

  public checkInterval: NodeJS.Timeout;

  public options: QueueOptions<
    QueueName,
    ClassConstructor<JobInput>,
    ClassConstructor<JobOutput>
  >;

  public constructor(
    options: QueueOptions<
      QueueName,
      ClassConstructor<JobInput>,
      ClassConstructor<JobOutput>
    >,
  ) {
    this.queue = new BullMQQueue(options.name, options.bullOptions);
    this.queueEvents = new BullMQQueueEvents(options.name, options.bullOptions);

    this.options = options;
  }

  private terminateWorkers(): Promise<number[]> {
    return Promise.all(this.workers.map((worker) => worker.terminate()));
  }

  private async checkActiveJobs(): Promise<number[] | void> {
    const activeJobCount = await this.queue.getActiveCount();

    console.log('Active Jobs: ', activeJobCount);

    if (this.hasRun === false) {
      if (activeJobCount > 0) {
        this.hasRun = true;
      }

      return;
    }

    if (activeJobCount === 0) {
      clearInterval(this.checkInterval);

      logger.info(`Shutting down workers`);

      return this.terminateWorkers();
    }
  }

  /**
   * Start watching workers for active tasks and kill workers upon empty Queue
   */
  private startWatching(): void {
    this.checkInterval = setInterval(() => {
      this.checkActiveJobs().catch((err) => {
        logger.error(
          `Queue({${this.queue.name}) startWatching error: ${JSON.stringify(
            err,
          )}`,
        );

        return this.terminateWorkers();
      });
    }, 500);
  }

  /**
   *
   * @param workerPath Absolute path to the Worker File
   *
   * @example
   * ```ts
   * const moduleMapQueue = new Queue('randomQueue');
   *
   * const workerPathURI = await import.meta.resolve(
   *  './TypeScriptModuleMapWorker',
   *  );
   * const workerPath = fileURLToPath(workerPathURI);
   *
   * await moduleMapQueue.createWorkers(workerPath);
   *
   * ```
   *
   * @returns Promise resolving once the workers threads have all been created
   */
  public async createWorkers(workerPath: string): Promise<void> {
    await this.queue.clean(0, 1000);

    console.log('Creating worker: ', workerPath);

    for (const _workerThread of Array(cpus().length - 1).fill(0)) {
      logger.info('Spawning worker');

      const worker = spawnWorker(workerPath, {
        redisOptions: JSON.stringify(this.queue.opts),
        queName: this.queue.name,
      });

      this.workers.push(worker);
    }

    return this.startWatching();
  }

  /**
   * Create a new Job/Task for the queue
   * @param input Job Input data
   *
   * @example
   * ```ts
   * interface ModuleMapJobInput {
   *   redisHost: string;
   *   filePath: string;
   * }
   *
   * const moduleMapQueue = new Queue<ModuleMapJobInput>('randomQueue');
   *
   * const workerPathURI = await import.meta.resolve(
   *  './ModuleMapWorker',
   *  );
   * const workerPath = fileURLToPath(workerPathURI);
   *
   * await moduleMapQueue.createWorkers(workerPath);
   *
   * const jobInput: ModuleMapJobInput = {
   *   redisHost: 'redis',
   *   filePath: '/workspace/src/index.ts'
   * }
   *
   * await moduleMapQueue.addTask(jobInput)
   * ```
   *
   * @returns BullMQ Job object
   */
  public addTask(input: JobInput): Promise<Job> {
    const job = this.queue.add(this.options.name, input);

    logger.debug(`Queue.addTask(${JSON.stringify(input)})`);

    return job;
  }

  public async waitForTask(task: Job): Promise<void> {
    const jobOutput = (await task.waitUntilFinished(
      this.queueEvents,
    )) as JobOutput;

    logger.debug(
      `Queue.waitForTask(${task.name}) ${JSON.stringify(jobOutput)}`,
    );
  }
}
