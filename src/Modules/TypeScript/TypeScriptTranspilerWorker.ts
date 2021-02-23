// src/Modules/TypeScript/TypeScriptTranspilerWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { plainToClass } from 'class-transformer';
import { Worker } from 'bullmq';
import { logger as coreLogger } from '../../Library/Logger';
import {
  transpileModule,
  ModuleKind,
  ScriptTarget,
  ModuleResolutionKind,
} from 'typescript';
import { WorkerInput } from '../Queues/WorkerInput';
import { validateOrReject } from 'class-validator';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';
import { readFile } from 'fs/promises';
import { threadId } from 'worker_threads';
import { RedisController } from '../Redis/RedisController';
import { RedisType } from '../Redis/RedisTypes';

const logger = coreLogger.child({
  labels: { worker: 'TypeScriptTranspilerWorker.ts', workeId: threadId },
});

logger.info(`Worker starting`);

const workerInput = await WorkerInput.createWorkerInput(
  getWorkerData(import.meta.url),
);

const redisController = new RedisController({
  ...(workerInput.queueOptions.connection as { host: string }),
});

logger.debug(`Retrieved workerData:`, {
  objectName: 'workerInput',
  workerInput,
});

/**
 * Transform provided filepath to ESM with TypeScript Compiler API
 * @param filePath Path to file to load, transform, and transpile to ESM
 * @returns Promise resolving to string of tranformed file.
 */
async function transformFile(filePath: string): Promise<string> {
  logger.info(`Transforming ${filePath}`);

  logger.silly(`Loading File`, {
    filePath,
  });

  const file = await readFile(filePath);

  const transpiledModule = transpileModule(file.toString(), {
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.NodeJs,
      target: ScriptTarget.ESNext,
      isolatedModules: true,
      inlineSourceMap: true,
    },
  });

  return transpiledModule.outputText;
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

    const sourceText = await transformFile(jobInput.filePath);

    await redisController.setValue(RedisType.MODULE, {
      key: jobInput.filePath,
      value: sourceText,
    });

    logger.silly('Done', {
      filePath: jobInput.filePath,
    });
  },
  {
    connection: workerInput.queueOptions.connection,
  },
);

logger.silly(`Created transpilerWorker`, {
  objectName: 'transpilerWorker',
  transpilerWorker,
});
