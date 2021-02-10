// src/Modules/TypeScript/TypeScriptController.ts
import { spawnWorker } from '@k-foss/ts-worker';
import { Job } from 'bullmq';
import { cpus } from 'os';
import { Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { Queue } from '../Ques/Que';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';

type filePath = string;

@Service()
export class TypeScriptController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  public constructor(private transpilerQue: Queue<filePath>) {
    logger.debug(`TypeScriptController.constructor()`);

    transpilerQue.createQueue('typescriptTranspiler');
  }

  public async createWorkers(): Promise<void> {
    logger.info(`TypeScriptController.createWorkers()`);

    const workerPath = await import.meta.resolve(
      './TypeScriptTranspilerWorker',
    );

    logger.debug(
      `TypeScriptController.createWorkers() path: ${workerPath} containerId: ${this.options.serverId}`,
    );

    for (const _workerThread of Array(cpus().length - 1).fill(0)) {
      logger.info('Spawning worker');

      const worker = spawnWorker(fileURLToPath(workerPath), {
        redisOptions: JSON.stringify(this.options.redis),
        queName: this.transpilerQue.queue.name,
      });

      logger.debug(`worker: `, worker.threadId);
    }

    logger.info(`workerPath: ${workerPath}`);
  }

  public createTask(filePath: string): Promise<Job> {
    const job = this.transpilerQue.queue.add(
      this.transpilerQue.queue.name,
      filePath,
    );

    logger.info(`TypeScriptController.createTask()`);

    return job;
  }
}
