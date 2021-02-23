// src/Modules/WebModule/WebModuleWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { threadId } from 'worker_threads';
import { logger as coreLogger } from '../../Library/Logger';
import { Queue, Worker } from 'bullmq';
import { WorkerInput } from '../Queues/WorkerInput';
import { WebModuleMapJobInput } from './WebModuleMapJobInput';
import { timeout } from '../../Utils/timeout';
import { RedisController } from '../Redis/RedisController';
import { WebModuleJobInput } from './WebModuleJobInput';

const logger = coreLogger.child({
  labels: { worker: 'WebModuleWorker.ts', workeId: threadId },
});

logger.info(`Worker starting`);

const workerInput = await WorkerInput.createWorkerInput(
  getWorkerData(import.meta.url),
);

logger.debug(`Retrieved workerData:`, {
  objectName: 'workerInput',
  workerInput,
});

const redisController = new RedisController({
  ...(workerInput.queueOptions.connection as { host: string }),
});

const webModuleMapQue = new Queue(workerInput.queName, {
  ...workerInput.queueOptions,
});

const webModuleQue = new Queue('webModuleQueue', {
  ...workerInput.queueOptions,
});

logger.silly(`webModuleQue has been created`, {
  webModuleMapQue,
});

const moduleMapWorker = new Worker<WebModuleMapJobInput>(
  workerInput.queName,
  async (job) => {
    logger.silly(`New Web Module Map Job:`, {
      data: job.data,
    });

    await timeout(60);
  },
  {
    connection: workerInput.queueOptions.connection,
  },
);

logger.silly(`moduleMapWorker`, {
  moduleMapWorker,
});

const moduleWorker = new Worker<WebModuleMapJobInput>(
  'webModuleQueue',
  async (job) => {
    logger.silly(`New Web Module Job:`, {
      data: job.data.filePath,
    });

    const input = await WebModuleJobInput.createWebModuleJobInput(job.data);

    await redisController.IORedis.set(input.filePath, input.sourceText);
  },
  {
    connection: workerInput.queueOptions.connection,
  },
);

logger.silly(`moduleWorker`, {
  moduleWorker,
});
