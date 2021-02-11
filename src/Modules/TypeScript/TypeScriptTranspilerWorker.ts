// src/Modules/TypeScript/TypeScriptWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { plainToClass } from 'class-transformer';
import { Worker } from 'bullmq';
import { logger as coreLogger } from '../../Library/Logger';
import { WorkerInput } from './WorkerInput';
import { validateOrReject } from 'class-validator';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';
import { readFile } from 'fs/promises';
import { threadId } from 'worker_threads';

const logger = coreLogger.child({
  workerFile: 'TypeScriptTranspilerWorker.ts',
  workerId: threadId,
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

async function transformFile(filePath: string): Promise<string> {
  logger.info(`Transforming ${filePath}`);

  logger.silly(`Loading File`, {
    filePath,
  });

  const file = await readFile(filePath);

  logger.debug(`Opened file`, {
    filePath,
    file,
  });

  return `console.log('helloWorld')`;
}

const transpilerWorker = new Worker<TranspilerWorkerJobInput>(
  workerInput.queName,
  async (job) => {
    logger.info(`Recieved a task for transpilerWorker`, {
      worker: 'transpilerWorker',
    });

    logger.debug(`Task input`, {
      worker: 'transpilerWorker',
      jobInput: job.data,
    });

    const jobInput = plainToClass(TranspilerWorkerJobInput, job.data);

    logger.debug(`Transformed job.data to Class`, {
      worker: 'transpilerWorker',
      objectName: 'jobInput',
      jobInput,
    });

    await validateOrReject(jobInput);

    logger.debug(`Validated jobInput`, {
      worker: 'transpilerWorker',
      jobInput,
    });

    const transformedModule = await transformFile(jobInput.filePath);

    logger.debug(`transpilerWorker transformedModule: ${transformedModule}`);

    return {
      test: 'shti',
    };
  },
  {
    connection: workerInput.queueOptions.connection,
    concurrency: 2,
  },
);

logger.debug(`Created transpilerWorker`, {
  objectName: 'transpilerWorker',
  transpilerWorker,
});
