// src/Modules/TypeScript/TypeScriptController.ts
import { spawnWorker } from '@k-foss/ts-worker';
import { Worker } from 'bullmq/src';
import { resolve } from 'path';
import { Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { timeout } from '../../Utils/timeout';
import { Queue } from '../Ques/Que';
import { serverOptionsToken, ServerOptions } from '../Server/ServerOptions';

type TypeScriptQueType = 'helloFucker';

@Service()
export class TypeScriptController {
  public worker: Worker<TypeScriptQueType>;

  @Inject(serverOptionsToken)
  public options: ServerOptions;

  public constructor(private typescriptQue: Queue<TypeScriptQueType>) {
    logger.info(`TypeScriptController.constructor()`, typescriptQue);

    typescriptQue.createQueue('typescriptTranspile');
  }

  public async createWorkers(): Promise<void> {
    logger.info(`TypeScriptController.createWorkers()`);

    const workerPath = resolve(
      fileURLToPath(import.meta.url),
      '../TypeScriptWorker.ts',
    );

    logger.debug(
      `TypeScriptController.createWorkers() path: ${workerPath} containerId: ${this.options.serverId}`,
    );

    const worker = spawnWorker(workerPath, {
      redisOptions: JSON.stringify(this.options.redis),
    });

    console.log('Worker: ', worker);

    logger.info(`workerPath: ${workerPath}`);

    await timeout(50);
  }

  public async createTask(taskInput: TypeScriptQueType): Promise<string> {
    const job = this.typescriptQue.queue.add(
      this.typescriptQue.queue.name,
      'helloFucker',
    );

    logger.info(`TypeScriptController.createTask()`);
    await timeout(50);

    return 'test';
  }
}
