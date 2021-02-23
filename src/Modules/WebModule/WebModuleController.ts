/* eslint-disable @typescript-eslint/no-unused-vars-experimental */
// src/Modules/WebModule/WebModuleController.ts
import { Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { Queue } from '../Queues/Queue';
import { QueueController } from '../Queues/QueueController';
import { WebModuleMapJobInput } from './WebModuleMapJobInput';

@Service()
export class WebModuleController {
  /**
   * Redis Queue for Web Module Map Discovery Tasks
   */
  private webModuleMapQueue: Queue<'webModuleMapQueue', WebModuleMapJobInput>;

  public constructor(
    @Inject(() => QueueController)
    private queueController: QueueController,
  ) {
    this.webModuleMapQueue = queueController.createQueue({
      name: 'webModuleMapQueue',
      inputClass: WebModuleMapJobInput,
      disableTermination: true,
    });
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
}
