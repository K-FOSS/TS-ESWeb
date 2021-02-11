// src/Modules/TypeScript/TypeScriptController.ts
import { Job } from 'bullmq';
import { Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { Queue } from '../Queues/Queue';
import { QueueController } from '../Queues/QueueController';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';
import { ModuleMapWorkerJobInput } from './ModuleMapWorkerJobInput';
import { ResolvedModuleMap } from './ResolvedModuleMap';
import { TranspiledModuleOutput } from './TranspiledModuleOutput';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';

@Service()
export class TypeScriptController {
  /**
   * Transpiler Que and Workers for transpiling Files to ESModules
   */
  private transpilerQueue: Queue<
    'typescriptTranspiler',
    TranspilerWorkerJobInput,
    TranspiledModuleOutput
  >;

  /**
   * Module Map Que and Workers for determining all imported and related modules and files
   */
  private moduleMapQueue: Queue<
    'typescriptModuleMap',
    ModuleMapWorkerJobInput,
    ResolvedModuleMap
  >;

  public constructor(
    @Inject(serverOptionsToken)
    public options: ServerOptions,
    @Inject(() => QueueController)
    private queueController: QueueController,
  ) {
    logger.debug(`TypeScriptController.constructor()`);

    const typescriptTranspilerKey = 'typescriptTranspiler';
    const moduleMapQueKey = 'typescriptModuleMap';

    this.transpilerQueue = this.queueController.createQueue(
      typescriptTranspilerKey,
      TranspilerWorkerJobInput,
      TranspiledModuleOutput,
    );

    this.moduleMapQueue = this.queueController.createQueue(
      moduleMapQueKey,
      ModuleMapWorkerJobInput,
      ResolvedModuleMap,
    );
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

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    // this.moduleMapQueue.queueEvents.on('completed', async (msg) => {
    //   const job = await this.moduleMapQueue.queue.getJob(msg.jobId);

    //   console.log('JobInput: ', job.data);

    //   const jobOutput = plainToClass(ResolvedModuleMap, msg.returnvalue);
    //   const jobInput = plainToClass(ModuleMapWorkerJobInput, job?.data);

    //   console.log('MotherFucker', msg.returnvalue);

    //   console.log(
    //     `${jobInput.specifier || jobInput.filePath} resovled ${JSON.stringify(
    //       jobOutput?.importedModules,
    //     )}`,
    //   );
    // });
  }

  /**
   * Spawn the TypeScript Transpiler Workers
   */
  public async createTranspilerWorkers(): Promise<void> {
    logger.info(`TypeScriptController.createTranspilerWorkers()`);

    const workerPathURI = await import.meta.resolve(
      './TypeScriptTranspilerWorker',
    );
    const workerPath = fileURLToPath(workerPathURI);

    await this.transpilerQueue.createWorkers(workerPath);

    logger.debug(
      `TypeScriptController.createTranspilerWorkers() workerPathURI: ${workerPathURI}`,
    );

    // for (const _workerThread of Array(cpus().length - 1).fill(0)) {
    //   logger.info('Spawning Transpiler worker');

    //   const { spawnWorker } = await import('@k-foss/ts-worker');

    //   console.log('TranspileQueFucker: ', this.transpilerQueue.name);

    //   const worker = spawnWorker(fileURLToPath(workerPathURI), {
    //     redisOptions: JSON.stringify(this.options.redis),
    //     queName: this.transpilerQueue.name,
    //   });
    // }
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
  ): Promise<Job> {
    const job = this.transpilerQueue.addTask(jobInput);

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
  public createModuleMapTask(jobInput: ModuleMapWorkerJobInput): Promise<Job> {
    const job = this.moduleMapQueue.addTask(jobInput);

    return job;
  }
}
