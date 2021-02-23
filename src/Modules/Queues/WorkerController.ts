// src/Modules/Queues/WorkerController.ts

import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import Container, { Inject, Service } from 'typedi';
import { logger } from '../../Library/Logger';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';
import { queueToken } from './QueueToken';
import { WorkerInput, workerInputToken } from './WorkerInput';

@Service()
export class WorkerController {
  public constructor(
    @Inject(serverOptionsToken)
    public options: ServerOptions,
  ) {
    logger.silly(`WorkerController`, {
      options,
    });
  }

  public static async createWorkerController(
    workerInput: WorkerInput,
  ): Promise<WorkerController> {
    const serverOptions = plainToClass(
      ServerOptions,
      workerInput.serverOptions,
    );
    await validateOrReject(serverOptions);

    Container.set({
      id: serverOptionsToken,
      global: true,
      value: serverOptions,
    });

    Container.set({
      id: queueToken,
      global: true,
      value: workerInput.queName,
    });

    Container.set({
      id: workerInputToken,
      global: true,
      value: workerInput,
    });

    return Container.get(WorkerController);
  }
}
