// src/Modules/Queues/Worker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import {} from 'worker_threads';
import { logger } from '../../Library/Logger';
import { WorkerInput } from './WorkerInput';
import { WorkerController } from './WorkerController';

const workerInput = await WorkerInput.createWorkerInput(
  getWorkerData(import.meta.url),
);

logger.silly(`workerInput`, {
  workerInput,
});

const workerController = await WorkerController.createWorkerController(
  workerInput,
);

logger.silly('WorkerSpawned: ', {
  workerController,
});

await import(workerInput.workerPath);
