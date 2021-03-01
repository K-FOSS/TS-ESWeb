// src/Modules/Queue/Queue.ts
import { spawnWorker } from '@k-foss/ts-worker';
import {
  Job,
  JobsOptions,
  Queue as BullMQQueue,
  QueueEvents as BullMQQueueEvents,
} from 'bullmq';
import { ClassConstructor, plainToClass } from 'class-transformer';
import EventEmitter from 'events';
import { fileURLToPath } from 'node:url';
import pEvent from 'p-event';
import { Logger } from 'winston';
import { Worker } from 'worker_threads';
import { logger } from '../../Library/Logger';
import { QueueOptions } from './QueueOptions';
import { WorkerInput } from './WorkerInput';

/**
 * Task Queue handled by dedicated `worker_threads` created by
 * [`@K-FOSS/TS-ESWorkers`](https://www.npmjs.com/package/@k-foss/ts-worker)
 *
 * The Queue is handled by [`bullmq`](https://www.npmjs.com/package/bullmq) with
 * a Redis backend
 */
export class Queue<QueueName extends string, JobInput> {
  /**
   * BullMQ Queue and QueueEvents object
   */
  public queue: BullMQQueue<JobInput, unknown, QueueName>;
  public queueEvents: BullMQQueueEvents;

  private events = new EventEmitter();

  /**
   * Array of Child Workers
   */
  private workers: Worker[] = [];

  /**
   * Boolean value if a single job has been created.
   */
  private hasRun = false;

  /**
   * Node.JS Interval to check if there are any active jobs if not,
   * and a job has already been created, the child workers are exited.
   */
  public checkInterval: NodeJS.Timeout;

  public options: QueueOptions<QueueName, ClassConstructor<JobInput>>;

  /**
   * Local logger object adding additional metadata
   */
  private logger: Logger;

  public constructor(
    options: QueueOptions<QueueName, ClassConstructor<JobInput>>,
  ) {
    this.queue = new BullMQQueue(options.name, options.bullOptions);
    this.queueEvents = new BullMQQueueEvents(options.name, options.bullOptions);

    this.options = options;

    this.logger = logger.child({
      queName: this.queue.name,
    });

    this.handleError = (...args): void => {
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

  private async getCounts(): Promise<number[]> {
    return Promise.all([
      this.queue.getDelayedCount(),
      this.queue.getActiveCount(),
      this.queue.getFailedCount(),
    ]);
  }

  /**
   * Check if there are any active jobs/tasks
   */
  // private async isRunningJobs(): Promise<number[] | void> {
  //   const jobCounts = await this.getCounts();

  //   this.logger.silly(`jobCounts: `, {
  //     jobCounts,
  //   });

  //   const anyJobs = jobCounts.some((jobCount) => jobCount > 0);

  //   if (this.hasRun === false) {
  //     if (anyJobs === true) {
  //       this.hasRun = true;
  //     }

  //     return;
  //   }

  //   if (anyJobs === false) {
  //     this.logger.silly('Terminating workers');

  //     return this.terminateWorkers();
  //   }
  // }

  // private handleDrained: () => void;

  /**
   * Start watching workers for active tasks and kill workers upon empty Queue
   */
  private startWatching(): void {
    if (this.options.disableTermination !== true) {
      let jobLessCounts = 0;

      const helloWorld = async (): Promise<void | number[]> => {
        const jobCounts = await this.getCounts();

        const anyJobs = jobCounts.some((jobCount) => jobCount > 0);

        if (this.hasRun === false) {
          if (anyJobs === true) {
            this.hasRun = true;
          }

          return;
        }

        if (anyJobs === false) {
          jobLessCounts++;

          if (jobLessCounts > 5) {
            return this.terminateWorkers();
          }
        }
      };

      setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        helloWorld();
      }, 500);
    }
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
   * ```
   *
   * @returns Promise resolving once the workers threads have all been created
   */
  public async createWorkers(
    subWorkerPath: string,
    workerCount = 2,
  ): Promise<void> {
    this.logger.debug(
      `Queue.createWorkers('${subWorkerPath}', ${workerCount})`,
    );

    this.logger.debug(`Queue.createWorkers() cleaning old jobs`);

    await this.cleanQueue();

    const workerInputParams: WorkerInput = {
      serverOptions: this.options.serverOptions,
      queueOptions: this.queue.opts,
      queName: this.queue.name,
      workerCount,
      workerPath: subWorkerPath,
    };

    this.logger.silly(`workerInputParams: `, {
      workerInputParams,
    });

    const workerInput = plainToClass(WorkerInput, workerInputParams);

    const workerPathURI = await import.meta.resolve('./Worker');
    const workerPath = fileURLToPath(workerPathURI);

    for (const _workerThread of Array(workerInputParams.workerCount).fill(0)) {
      this.logger.info(`Queue.createWorkers() spawning worker`);

      const worker = spawnWorker(workerPath, workerInput);

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
