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
import { ClassConstructor, plainToClass } from 'class-transformer';
import { Logger } from 'winston';
import { WorkerInput } from '../TypeScript/WorkerInput';

/**
 * Task Queue handled by dedicated `worker_threads` created by
 * [`@K-FOSS/TS-ESWorkers`](https://www.npmjs.com/package/@k-foss/ts-worker)
 *
 * The Queue is handled by [`bullmq`](https://www.npmjs.com/package/bullmq) with
 * a Redis backend
 */
export class Queue<QueueName extends string, JobInput, JobOutput> {
  /**
   * BullMQ Queue and QueueEvents object
   */
  public queue: BullMQQueue<JobInput, unknown, QueueName>;
  public queueEvents: BullMQQueueEvents;

  /**
   * Array of Child Workers
   */
  public workers: Worker[] = [];

  /**
   * Boolean value if a single job has been created.
   */
  public hasRun = false;

  /**
   * Node.JS Interval to check if there are any active jobs if not,
   * and a job has already been created, the child workers are exited.
   */
  public checkInterval: NodeJS.Timeout;

  public options: QueueOptions<
    QueueName,
    ClassConstructor<JobInput>,
    ClassConstructor<JobOutput>
  >;

  /**
   * Local logger object adding additional metadata
   */
  private logger: Logger;

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

    this.logger = logger.child({
      queName: this.queue.name,
    });
  }

  /**
   * Terminate all worker threads.
   */
  private terminateWorkers(): Promise<number[]> {
    return Promise.all(this.workers.map((worker) => worker.terminate()));
  }

  /**
   * Clean all jobs from Redis/BullMQ
   */
  private async cleanQueue(): Promise<unknown[]> {
    this.logger.debug(`Queue.cleanQueue()`);

    return Promise.all([
      this.queue.clean(0, 1000, 'active'),
      this.queue.clean(0, 1000),
    ]);
  }

  /**
   * Check if there are any active jobs/tasks
   */
  private async checkActiveJobs(): Promise<number[] | void> {
    const activeJobCount = await this.queue.getActiveCount();

    this.logger.debug(`Queue.checkActiveJobs()`, {
      activeJobCount,
    });

    if (this.hasRun === false) {
      if (activeJobCount > 0) {
        this.hasRun = true;
      }

      return;
    }

    if (activeJobCount === 0) {
      clearInterval(this.checkInterval);

      this.logger.info(`Queue.checkActiveJobs() Shutting down workers`);

      return this.terminateWorkers();
    }
  }

  /**
   * Start watching workers for active tasks and kill workers upon empty Queue
   */
  private startWatching(): void {
    this.checkInterval = setInterval(() => {
      this.checkActiveJobs().catch((err) => {
        this.logger.error(
          `Queue.startWatching() startWatching error: ${JSON.stringify(err)}`,
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
    this.logger.debug(`Queue.createWorkers('${workerPath}')`);

    this.logger.debug(`Queue.createWorkers() cleaning old jobs`);

    await this.cleanQueue();

    const workerInput: WorkerInput = {
      queueOptions: this.queue.opts,
      queName: this.queue.name,
    };

    for (const _workerThread of Array(cpus().length - 1).fill(0)) {
      this.logger.info(`Queue.createWorkers() spawning worker`);

      const worker = spawnWorker(
        workerPath,
        plainToClass(WorkerInput, workerInput),
      );

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

    this.logger.debug(`Queue.addTask(${JSON.stringify(input)})`);

    return job;
  }

  /**
   * Wait for the result of the specified task
   * @param task BullMQ Job entity
   */
  public async waitForTask(task: Job): Promise<void> {
    const jobOutput = (await task.waitUntilFinished(
      this.queueEvents,
    )) as JobOutput;

    this.logger.debug(
      `Queue.waitForTask(${task.name}) ${JSON.stringify(jobOutput)}`,
    );
  }
}
