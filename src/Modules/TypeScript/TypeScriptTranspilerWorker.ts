// src/Modules/TypeScript/TypeScriptWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { plainToClass } from 'class-transformer';
import { Worker } from 'bullmq';
import { logger } from '../../Library/Logger';
import { TranspilerWorkerInput } from './TranspilerWorkerInput';
import { validateOrReject } from 'class-validator';
import { RedisOptions } from '../Redis/RedisOptions';

const data = getWorkerData(import.meta.url);

logger.debug(`TypeScriptWorker`, data);

const workerInput = plainToClass(TranspilerWorkerInput, <TranspilerWorkerInput>{
  redisOptions: JSON.parse(data.redisOptions) as RedisOptions,
  queName: data?.queName as string,
});

logger.debug(`TypeScriptTranspilerWorker: `, workerInput);

await validateOrReject(workerInput);

async function transformFile(filePath: string): Promise<string> {
  logger.info(`Transforming ${filePath}`);

  return `console.log('helloWorld')`;
}

const transpilerWorker = new Worker<string>(
  workerInput.queName,
  async (job) => {
    logger.info(`TypeScript Transpiler Worker: filePath: ${job.data}`);

    const transformedModule = await transformFile(job.data);

    logger.debug(`transpilerWorker transformedModule: ${transformedModule}`);
  },
  {
    connection: {
      host: workerInput.redisOptions.hostname,
    },
    concurrency: 2,
  },
);

logger.debug(`TypeScriptTranspilerWorker.ts worker: `, transpilerWorker);
