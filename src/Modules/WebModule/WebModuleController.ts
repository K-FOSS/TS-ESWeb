// src/Modules/WebModule/WebModuleController.ts
import { Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { Queue } from '../Queues/Queue';
import { QueueController } from '../Queues/QueueController';
import { WebModuleJobInput } from './WebModuleJobInput';

@Service()
export class WebModuleController {
  private webModuleQueue: Queue<'webModuleQueue', WebModuleJobInput>;

  public constructor(
    @Inject(() => QueueController)
    private queueController: QueueController,
  ) {
    this.webModuleQueue = queueController.createQueue(
      'webModuleQueue',
      WebModuleJobInput,
    );
  }

  public async spawnWebModuleWorkers(): Promise<void> {
    const workerPathURI = await import.meta.resolve('./WebModuleWorker');
    const workerPath = fileURLToPath(workerPathURI);

    /**
     * Create the @K-FOSS/TS-ESWorkers.
     */
    await this.webModuleQueue.createWorkers(workerPath, 1);

    logger.debug(
      `TypeScriptController.createModuleMapWorkers() workerPathURI: ${workerPathURI}`,
    );
  }
}
