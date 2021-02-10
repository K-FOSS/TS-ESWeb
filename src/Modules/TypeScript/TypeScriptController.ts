// src/Modules/TypeScript/TypeScriptController.ts
import { spawnWorker } from '@k-foss/ts-worker';
import { Job } from 'bullmq';
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

    const workerPathURI = await import.meta.resolve(
      './TypeScriptModuleMapWorker',
    );

    logger.debug(
      `TypeScriptController.createModuleMapWorkers() workerPathURI: ${workerPathURI} containerId: ${this.options.serverId}`,
    );

    for (const _workerThread of Array(cpus().length - 1).fill(0)) {
      logger.info('Spawning worker');

      const worker = spawnWorker(fileURLToPath(workerPathURI), {
        redisOptions: JSON.stringify(this.options.redis),
        queName: this.moduleMapQue.queue.name,
      });

      logger.debug(`worker: `, worker.threadId);
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

    logger.info(
      `TypeScriptController.createModuleMapTask(${JSON.stringify(jobInput)})`,
    );

    return job;
  }
}
