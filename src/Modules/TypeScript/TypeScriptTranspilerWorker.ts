// src/Modules/TypeScript/TypeScriptWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { plainToClass } from 'class-transformer';
import { Worker } from 'bullmq';
import { logger } from '../../Library/Logger';
import { WorkerInput } from './WorkerInput';
import { validateOrReject } from 'class-validator';
import { RedisOptions } from '../Redis/RedisOptions';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';
import { timeout } from '../../Utils/timeout';

const data = getWorkerData(import.meta.url);

console.log(`TranspilerWorker:`, data, import.meta.url);

const workerInput = plainToClass(WorkerInput, <WorkerInput>{
  redisOptions: JSON.parse(data.redisOptions) as RedisOptions,
  queName: data?.queName as string,
});

console.log('TranspilerWorkerInput: ', workerInput);

await validateOrReject(workerInput);

console.log(workerInput.redisOptions);

async function transformFile(filePath: string): Promise<string> {
  logger.info(`Transforming ${filePath}`);

  await timeout(50);

  return `console.log('helloWorld')`;
}

const _transpilerWorker = new Worker<TranspilerWorkerJobInput>(
  workerInput.queName,
  async (job) => {
    const jobInput = plainToClass(TranspilerWorkerJobInput, job.data);

    await validateOrReject(jobInput);

    logger.info(`TypeScript Transpiler Worker: filePath: ${jobInput.filePath}`);

    const transformedModule = await transformFile(jobInput.filePath);

    logger.debug(`transpilerWorker transformedModule: ${transformedModule}`);

    return {
      test: 'shti',
    };
  },
  {
    connection: workerInput.redisOptions.connection,
    concurrency: 2,
  },
);
