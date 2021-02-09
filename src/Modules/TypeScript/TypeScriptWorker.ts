// src/Modules/TypeScript/TypeScriptWorker.ts
import { Worker } from 'bullmq';
import { logger } from '../../Library/Logger';
import { workerData } from 'worker_threads';
import { getWorkerData } from '@k-foss/ts-worker';
import Container from 'typedi';
import { RedisOptions } from '../Redis/RedisOptions';

const data = getWorkerData(import.meta.url);

const redisOptions = JSON.parse(data.redisOptions);

function isRedisOptions(input: RedisOptions): input is RedisOptions {
  return 'hostname' in input;
}

if (!isRedisOptions(redisOptions)) {
  throw new Error('Invalid Redis Options provided to worker');
}

const TSWorker = new Worker(
  'typescriptTranspile',
  async (job) => {
    logger.info(`TypeScriptWorker.TSWorker job ${JSON.stringify(job)}`);

    return 'helloWorld';
  },
  {
    connection: {
      host: redisOptions.hostname,
    },
  },
);
