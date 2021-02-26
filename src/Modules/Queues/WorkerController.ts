// src/Modules/Queues/WorkerController.ts

import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { basename } from 'node:path';
import Container, { Inject, Service, Token } from 'typedi';
import { Logger } from 'winston';
import { logger as coreLogger } from '../../Library/Logger';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';
import { queueToken } from './QueueToken';
import { WorkerInput, workerInputToken } from './WorkerInput';

@Service()
export class WorkerController {
  public logger: Logger;

  public constructor(
    @Inject(workerInputToken)
    public workerInput: WorkerInput,
  ) {
    this.logger = coreLogger.child({
      labels: {
        appName: 'TS-ESWeb',
        worker: basename(workerInput.workerPath),
        queueName: workerInput.queName,
      },
    });

    this.logger.silly(`WorkerController created`);
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

    const workerController = Container.get(WorkerController);
    Container.set({
      id: workerControllerToken,
      global: true,
      value: workerController,
    });

    return Container.get(workerControllerToken);
  }
}

/**
 * TypeDI Token for the current workers WorkerController
 */
export const workerControllerToken = new Token<WorkerController>(
  'workerController',
);
