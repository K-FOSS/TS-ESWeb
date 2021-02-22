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
  ScriptKind,
  ModuleResolutionKind,
} from 'typescript';
import { WorkerInput } from '../Queues/WorkerInput';
import { validateOrReject } from 'class-validator';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';
import { readFile } from 'fs/promises';
import { threadId } from 'worker_threads';

const logger = coreLogger.child({
  labels: { worker: 'TypeScriptTranspilerWorker.ts', workeId: threadId },
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

  logger.silly(`Transpiled Module`, {
    filePath,
    transpiledModule: transpiledModule.outputText,
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

    return transformFile(jobInput.filePath);
  },
  {
    connection: workerInput.queueOptions.connection,
    concurrency: workerInput.workerCount,
  },
);

logger.silly(`Created transpilerWorker`, {
  objectName: 'transpilerWorker',
  transpilerWorker,
});
