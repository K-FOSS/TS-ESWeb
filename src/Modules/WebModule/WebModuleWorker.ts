// src/Modules/WebModule/WebModuleWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { threadId } from 'worker_threads';
import { logger as coreLogger } from '../../Library/Logger';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Queue, Worker } from 'bullmq';
import { WorkerInput } from '../Queues/WorkerInput';
import { WebModuleJobInput } from './WebModuleJobInput';
import { timeout } from '../../Utils/timeout';

const logger = coreLogger.child({
  labels: { worker: 'WebModuleWorker.ts', workeId: threadId },
});

logger.info(`Worker starting`);

const data = getWorkerData(import.meta.url);

logger.debug(`Retrieved workerData:`, {
  objectName: 'data',
  data,
});

const workerInput = plainToClass(WorkerInput, data);

logger.debug(`Transformed to class`, {
  objectName: 'workerInput',
  workerInput,
});

await validateOrReject(workerInput);

const webModuleQue = new Queue(workerInput.queName, {
  ...workerInput.queueOptions,
});

logger.silly(`webModuleQue has been created`, {
  webModuleQue,
});

const moduleWorker = new Worker<WebModuleJobInput>(
  workerInput.queName,
  async (job) => {
    logger.silly(`New Web Module Job:`, {
      data: job.data,
    });

    await timeout(60);
  },
  {
    connection: workerInput.queueOptions.connection,
  },
);

logger.silly(`moduleWorker`, {
  moduleWorker,
});
