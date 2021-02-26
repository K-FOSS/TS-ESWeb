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
import { TypeScriptTransformerController } from '../../Library/Transformers';
import { Environment, envMode } from '../../Utils/Environment';
import { processModule } from '../Files/processModule';
// import { QueueController } from '../Queues/QueueController';
import { queueToken } from '../Queues/QueueToken';
import { workerControllerToken } from '../Queues/WorkerController';
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

const workerController = Container.get(workerControllerToken);

const queueName = Container.get(queueToken);
const workerInput = Container.get(workerInputToken);

const redisController = Container.get(RedisController);

logger.debug(`Retrieved workerData:`, {
  objectName: 'workerInput',
  workerInput,
});

const transformerController = new TypeScriptTransformerController();

/**
 * Transform provided filepath to ESM with TypeScript Compiler API
 * @param filePath Path to file to load, transform, and transpile to ESM
 * @returns Promise resolving to string of tranformed file.
 */
async function transformFile(filePath: string): Promise<string> {
  workerController.logger.info(`Transforming ${filePath}`);

  workerController.logger.silly(`Loading File`, {
    filePath,
  });

  const file = await readFile(filePath);

  let fileContents: string;

  fileContents = processModule(file.toString());

  workerController.logger.silly(`Getting TypeScript Transformers`);

  await transformerController.loadTransformers();

  workerController.logger.silly(`EnvMode`, {
    envMode,
  });

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
      jsx:
        workerInput.serverOptions.envMode === Environment.PRODUCTION
          ? JsxEmit.ReactJSX
          : JsxEmit.ReactJSXDev,
      jsxFragmentFactory: 'Fragment',
    },
  });

  return transpiledModule.outputText.replaceAll('exports.', '');
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

    logger.silly(`Module ${jobInput.filePath} has been transpiled`);

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
  transpilerWorkerName: transpilerWorker.name,
});
