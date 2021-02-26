// src/Modules/Queues/Worker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import { logger } from '../../Library/Logger';
import '../../Utils/Setup';
import { WorkerController } from './WorkerController';
import { WorkerInput } from './WorkerInput';

const workerInput = await WorkerInput.createWorkerInput(
  getWorkerData(import.meta.url),
);

logger.silly(`workerInput`, {
  workerInput,
});

const workerController = await WorkerController.createWorkerController(
  workerInput,
);

workerController.logger.info(`Worker has been spawned`);

await import(workerInput.workerPath);
