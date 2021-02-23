// src/Modules/TypeScript/TypeScriptTranspilerWorker.ts
import { Worker } from 'bullmq';
import { cjsToEsmTransformerFactory } from 'cjstoesm';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { readFile } from 'fs/promises';
import Container from 'typedi';
import {
  JsxEmit,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  transpileModule,
} from 'typescript';
import { threadId } from 'worker_threads';
import { logger as coreLogger } from '../../Library/Logger';
import { processModule } from '../Files/processModule';
// import { QueueController } from '../Queues/QueueController';
import { queueToken } from '../Queues/QueueToken';
import { workerInputToken } from '../Queues/WorkerInput';
import { RedisController } from '../Redis/RedisController';
import { RedisType } from '../Redis/RedisTypes';
import { ImportTransformer } from '../WebModule/ImportTransformer';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';

const logger = coreLogger.child({
  labels: { worker: 'TypeScriptTranspilerWorker.ts', workeId: threadId },
});

logger.info(`Worker starting`, {
  labels: {
    worker: 'TypeScriptTranspilerWorker.ts',
    workeId: threadId,
  },
});

// const queueController = Container.get(QueueController);

const queueName = Container.get(queueToken);
const workerInput = Container.get(workerInputToken);

const redisController = Container.get(RedisController);

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

  let fileContents = processModule(file.toString());

  const transpiledModule = transpileModule(fileContents, {
    fileName: filePath,
    transformers: {
      before: [cjsToEsmTransformerFactory()],
      after: [new ImportTransformer().after],
      afterDeclarations: [
        // ...
      ],
    },
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.NodeJs,
      target: ScriptTarget.ESNext,
      inlineSourceMap: true,
      jsx: JsxEmit.ReactJSXDev,
      jsxFragmentFactory: 'Fragment',
    },
  });

  return transpiledModule.outputText;
}

const transpilerWorker = new Worker<TranspilerWorkerJobInput>(
  queueName,
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
