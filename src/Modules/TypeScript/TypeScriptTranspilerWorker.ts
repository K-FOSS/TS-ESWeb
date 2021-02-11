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

const data = getWorkerData(import.meta.url);

console.log(`TranspilerWorker:`, data, import.meta.url);

const workerInput = plainToClass(WorkerInput, <WorkerInput>{
  redisOptions: JSON.parse(data.redisOptions) as RedisOptions,
  queName: data?.queName as string,
});

await validateOrReject(workerInput);

async function transformFile(filePath: string): Promise<string> {
  logger.info(`Transforming ${filePath}`);

  return `console.log('helloWorld')`;
}

const transpilerWorker = new Worker<TranspilerWorkerJobInput>(
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
    connection: {
      host: workerInput.redisOptions.hostname,
    },
    concurrency: 2,
  },
);
