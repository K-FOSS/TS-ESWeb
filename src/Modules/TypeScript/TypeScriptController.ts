// src/Modules/TypeScript/TypeScriptController.ts
import { Job } from 'bullmq';
import { Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { Queue } from '../Queues/Queue';
import { QueueController } from '../Queues/QueueController';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';
import { ModuleMapWorkerJobInput } from './ModuleMapWorkerJobInput';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';

@Service()
export class TypeScriptController {
  /**
   * Transpiler Que and Workers for transpiling Files to ESModules
   */
  private transpilerQueue: Queue<
    'typescriptTranspiler',
    TranspilerWorkerJobInput
  >;

  /**
   * Module Map Que and Workers for determining all imported and related modules and files
   */
  private moduleMapQueue: Queue<'typescriptModuleMap', ModuleMapWorkerJobInput>;

  public constructor(
    @Inject(serverOptionsToken)
    public options: ServerOptions,
    @Inject(() => QueueController)
    private queueController: QueueController,
  ) {
    logger.debug(`TypeScriptController.constructor()`);

    const typescriptTranspilerKey = 'typescriptTranspiler';
    const moduleMapQueKey = 'typescriptModuleMap';

    this.transpilerQueue = this.queueController.createQueue({
      name: typescriptTranspilerKey,
      inputClass: TranspilerWorkerJobInput,
    });

    this.moduleMapQueue = this.queueController.createQueue({
      name: moduleMapQueKey,
      inputClass: ModuleMapWorkerJobInput,
    });
  }

  /**
   * Spawn the Module Map Workers
   */
  public async createModuleMapWorkers(): Promise<void> {
    logger.info(`TypeScriptController.createModuleMapWorkers()`);

    const workerPathURI = await import.meta.resolve(
      './TypeScriptModuleMapWorker',
    );
    const workerPath = fileURLToPath(workerPathURI);

    /**
     * Create the @K-FOSS/TS-ESWorkers.
     */
    await this.moduleMapQueue.createWorkers(workerPath);

    logger.debug(
      `TypeScriptController.createModuleMapWorkers() workerPathURI: ${workerPathURI}`,
    );
  }

  /**
   * Spawn the TypeScript Transpiler Workers
   */
  public async createTranspilerWorkers(): Promise<void> {
    logger.debug(`TypeScriptController.createTranspilerWorkers()`);

    const workerPathURI = await import.meta.resolve(
      './TypeScriptTranspilerWorker',
    );
    const workerPath = fileURLToPath(workerPathURI);

    await this.transpilerQueue.createWorkers(workerPath);

    logger.silly(
      `TypeScriptController.createTranspilerWorkers() workerPathURI: ${workerPathURI}`,
    );
  }

  /**
   * Transpile a new FilePath
   *
   * @param jobInput Input to pass to the Transpiler Worker
   *
   * @returns Promise resolving to the created BullMQ Job
   */
  public createTranspilerTask(
    jobInput: TranspilerWorkerJobInput,
  ): Promise<unknown> {
    logger.silly(`TypeScriptController.createTranspilerTask()`, {
      jobInput,
    });

    const job = this.transpilerQueue.addTask(jobInput, {
      jobId: jobInput.filePath,
    });

    logger.info(`TypeScriptController.createTask()`);

    return job;
  }

  /**
   * Create a new "job" to create a module map for a specified input module
   *
   * @param jobInput Input to pass to the Module Map Worker
   *
   * @returns Promise resolving to the created BullMQ Job
   */
  public async createModuleMapTask(
    jobInput: ModuleMapWorkerJobInput,
  ): Promise<Job> {
    return this.moduleMapQueue.addTask(jobInput, {
      jobId: jobInput.filePath,
    });
  }

  public waitForModuleMapDone(): Promise<void> {
    return this.moduleMapQueue.waitForDone();
  }

  public waitForTranspileDone(): Promise<void> {
    return this.transpilerQueue.waitForDone();
  }
}
