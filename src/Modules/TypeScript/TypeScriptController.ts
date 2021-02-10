// src/Modules/TypeScript/TypeScriptController.ts
import { spawnWorker } from '@k-foss/ts-worker';
import { Job } from 'bullmq';
import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { Queue } from '../Ques/Que';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';
import { ModuleMapWorkerJobInput } from './ModuleMapWorkerJobInput';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';

@Service()
export class TypeScriptController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  public constructor(
    private transpilerQue: Queue<TranspilerWorkerJobInput>,
    private moduleMapQue: Queue<ModuleMapWorkerJobInput>,
  ) {
    logger.debug(`TypeScriptController.constructor()`);

    transpilerQue.createQueue('typescriptTranspiler');
    moduleMapQue.createQueue('typescriptModuleMap');
  }

  public async createModuleMapWorkers(): Promise<void> {
    logger.info(`TypeScriptController.createModuleMapWorkers()`);

    const moduleMapQue = this.moduleMapQue.queue;

    const workerPathURI = await import.meta.resolve(
      './TypeScriptModuleMapWorker',
    );

    logger.debug(
      `TypeScriptController.createModuleMapWorkers() workerPathURI: ${workerPathURI} containerId: ${this.options.serverId}`,
    );

    await moduleMapQue.clean(0, 1000);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.moduleMapQue.queueEvents.on('completed', async (msg) => {
      const job = await moduleMapQue.getJob(msg.jobId);

      const specifier = job?.data?.specifier as string;

      console.log(
        `${specifier} resovled ${JSON.stringify(
          msg.returnvalue.importedModules,
        )}`,
      );
    });

    const workers: Worker[] = [];

    for (const _workerThread of Array(cpus().length - 1).fill(0)) {
      logger.info('Spawning worker');

      const worker = spawnWorker(fileURLToPath(workerPathURI), {
        redisOptions: JSON.stringify(this.options.redis),
        queName: moduleMapQue.name,
      });

      workers.push(worker);
    }

    const interval = setInterval(() => {
      checkActiveJobs();
    }, 500);

    let hasRun: boolean = false;

    async function checkActiveJobs(): Promise<number[] | void> {
      const activeJobCount = await moduleMapQue.getActiveCount();

      if (hasRun === false && activeJobCount > 0) {
        hasRun = true;
      }

      if (hasRun === false) {
        return;
      }

      console.log(activeJobCount);

      if (activeJobCount === 0) {
        clearInterval(interval);

        console.log('Shutting down workers');

        return Promise.all(workers.map((worker) => worker.terminate()));
      }
    }
  }

  public async createTranspilerWorkers(): Promise<void> {
    logger.info(`TypeScriptController.createTranspilerWorkers()`);

    const workerPathURI = await import.meta.resolve(
      './TypeScriptTranspilerWorker',
    );

    logger.debug(
      `TypeScriptController.createTranspilerWorkers() workerPathURI: ${workerPathURI} containerId: ${this.options.serverId}`,
    );

    for (const _workerThread of Array(cpus().length - 1).fill(0)) {
      logger.info('Spawning Transpiler worker');

      const worker = spawnWorker(fileURLToPath(workerPathURI), {
        redisOptions: JSON.stringify(this.options.redis),
        queName: this.transpilerQue.queue.name,
      });

      logger.debug(`worker: `, worker.threadId);
    }
  }

  public createTranspilerTask(
    jobInput: TranspilerWorkerJobInput,
  ): Promise<Job> {
    const job = this.transpilerQue.queue.add(
      this.transpilerQue.queue.name,
      jobInput,
    );

    logger.info(`TypeScriptController.createTask()`);

    return job;
  }

  public createModuleMapTask(jobInput: ModuleMapWorkerJobInput): Promise<Job> {
    const job = this.moduleMapQue.queue.add(
      this.moduleMapQue.queue.name,
      jobInput,
    );

    return job;
  }
}
