/* eslint-disable @typescript-eslint/no-unused-vars-experimental */
// src/Modules/WebModule/WebModuleController.ts
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { Queue } from '../Queues/Queue';
import { QueueController } from '../Queues/QueueController';
import { RedisController } from '../Redis/RedisController';
import { RedisType } from '../Redis/RedisTypes';
import { WebModule } from './WebModule';
import { WebModuleMapJobInput } from './WebModuleMapJobInput';
import { WebModuleReference } from './WebModuleReference';

type RedisWebModule = WebModule | WebModuleReference;

@Service()
export class WebModuleController {
  /**
   * Redis Queue for Web Module Map Discovery Tasks
   */
  private webModuleMapQueue: Queue<'webModuleMapQueue', WebModuleMapJobInput>;

  public constructor(
    @Inject(() => QueueController)
    private queueController: QueueController,
    @Inject(() => RedisController)
    private redisController: RedisController,
  ) {
    this.webModuleMapQueue = queueController.createQueue({
      name: 'webModuleMapQueue',
      inputClass: WebModuleMapJobInput,
      disableTermination: true,
    });
  }

  private isJSONString<T>(json: string): false | T {
    try {
      return JSON.parse(json) as T;
    } catch {
      return false;
    }
  }

  /**
   * Spawn Web Module Map Workers to handle the dep map
   */
  public async spawnWebModuleWorkers(): Promise<void> {
    const workerPathURI = await import.meta.resolve('./WebModuleWorker');
    const workerPath = fileURLToPath(workerPathURI);

    /**
     * Create the @K-FOSS/TS-ESWorkers.
     */
    await this.webModuleMapQueue.createWorkers(workerPath, 1);

    logger.debug(
      `TypeScriptController.spawnWebModuleMapWorkers() workerPathURI: ${workerPathURI}`,
    );
  }

  public async addWebModuleMapJob(
    input: Partial<WebModuleMapJobInput>,
  ): Promise<void> {
    logger.silly('WebModuleController.addWebModuleMapJob()', {
      input,
    });

    const jobInput = await WebModuleMapJobInput.createWebModuleJobInput(input);

    await this.webModuleMapQueue.addTask(jobInput);
  }

  public async getWebModule(specifier: string): Promise<WebModule> {
    const redisEntry = await this.redisController.getValue(
      RedisType.MODULE_MAP,
      specifier,
    );
    if (!redisEntry) {
      throw new Error('Invalid web module');
    }

    const webModuleInput = this.isJSONString(redisEntry);

    if (webModuleInput === false) {
      return this.getWebModule(redisEntry);
    } else {
      const webModule = plainToClass(WebModule, webModuleInput);
      await validateOrReject(webModule);

      return webModule;
    }
  }

  public async setWebModule(input: RedisWebModule): Promise<void> {
    if ('webModuleId' in input) {
      return this.redisController.setValue(RedisType.MODULE_MAP, {
        key: input.specifier,
        value: input.webModuleId,
      });
    }

    return this.redisController.setValue(RedisType.MODULE_MAP, {
      key: input.filePath,
      value: JSON.stringify(input),
    });
  }
}
