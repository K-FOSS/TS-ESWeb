// src/Modules/Queue/Queue.ts
import {
  Job,
  JobsOptions,
  Queue as BullMQQueue,
  QueueEvents as BullMQQueueEvents,
} from 'bullmq';
import { Worker } from 'worker_threads';
import { spawnWorker } from '@k-foss/ts-worker';
import { logger } from '../../Library/Logger';
import { QueueOptions } from './QueueOptions';
import { ClassConstructor, plainToClass } from 'class-transformer';
import { Logger } from 'winston';
import { WorkerInput } from '../TypeScript/WorkerInput';
import EventEmitter from 'events';
import pEvent from 'p-event';

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

  private events = new EventEmitter();

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

  public startDate = Date.now();

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

    this.handleError = (args): void => {
      this.logger.info(`Que has errored`, {
        ...args,
      });
    };

    this.queueEvents.on('failed', this.handleError);
  }

  private handleError: (
    args: {
      jobId: string;
      failedReason: string;
      prev?: string;
    },
    id: string,
  ) => void;

  /**
   * Terminate all worker threads.
   */
  private async terminateWorkers(): Promise<number[]> {
    const workerTeminiations = this.workers.map((worker) => worker.terminate());

    // this.queueEvents.removeListener('drained', this.handleDrained);

    this.events.emit('done');

    return Promise.all(workerTeminiations);
  }

  /**
   * Clean all jobs from Redis/BullMQ
   */
  private async cleanQueue(): Promise<unknown[]> {
    this.logger.debug(`Queue.cleanQueue()`);

    return Promise.all([
      this.queue.clean(0, 1000, 'active'),
      this.queue.clean(0, 1000, 'failed'),
      this.queue.clean(0, 1000, 'completed'),
      this.queue.clean(0, 1000, 'wait'),
      this.queue.clean(0, 1000, 'paused'),
      this.queue.clean(0, 1000),
    ]);
  }

  /**
   * Check if there are any active jobs/tasks
   */
  private async isRunningJobs(): Promise<number[] | void> {
    const jobCounts = await Promise.all([
      this.queue.getDelayedCount(),
      this.queue.getActiveCount(),
      this.queue.getFailedCount(),
      this.queue.getFailed(),
    ]);

    this.logger.silly(`jobCounts: `, {
      jobCounts,
    });

    const anyJobs = jobCounts.some((jobCount) => jobCount > 0);

    if (this.hasRun === false) {
      if (anyJobs === true) {
        this.hasRun = true;
      }

      return;
    }

    if (anyJobs === false) {
      logger.silly('Terminating workers');

      return this.terminateWorkers();
    }
  }

  private handleDrained: () => void;

  /**
   * Start watching workers for active tasks and kill workers upon empty Queue
   */
  private startWatching(): void {
    this.handleDrained = (): void => {
      this.isRunningJobs().catch(() => {
        return this.terminateWorkers();
      });
    };

    this.queueEvents.on('drained', this.handleDrained);
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

    for (const _workerThread of Array(6).fill(0)) {
      this.logger.info(`Queue.createWorkers() spawning worker`);

      const worker = spawnWorker(
        workerPath,
        plainToClass(WorkerInput, workerInput),
      );

      worker.on('error', (err) => {
        this.logger.error(`Worker thread has errored`, {
          err,
        });

        this.logger.info(`TODO: Proper worker error handling`);
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
  public async addTask(input: JobInput, opts?: JobsOptions): Promise<Job> {
    const job = await this.queue.add(this.options.name, input, opts);

    this.logger.debug(`Queue.addTask(${JSON.stringify(input)})`);

    return job;
  }

  /**
   * Wait for the result of the specified task
   * @param task BullMQ Job entity
   */
  public async waitForTask<T>(task: Job): Promise<T> {
    this.logger.silly(`waitForTask()`);

    return task.waitUntilFinished(this.queueEvents) as Promise<T>;
  }

  public async waitForDone(): Promise<void> {
    return pEvent(this.events, 'done');
  }
}
