// src/Modules/TypeScript/TypeScriptModuleMapWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { plainToClass } from 'class-transformer';
import { Queue, QueueEvents, Worker } from 'bullmq';
import { logger as coreLogger } from '../../Library/Logger';
import { WorkerInput } from './WorkerInput';
import { validateOrReject } from 'class-validator';
import { threadId } from 'worker_threads';
import * as ts from 'typescript';
import { ModuleMapWorkerJobInput } from './ModuleMapWorkerJobInput';
import { dirname } from 'path';
import { getTSConfig } from './TSConfig';
import { fileURLToPath, pathToFileURL } from 'url';
import { ResolvedModuleMap } from './ResolvedModuleMap';

const logger = coreLogger.child({
  workerFile: 'TypeScriptModuleMapWorker.ts',
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

const moduleMapQue = new Queue(workerInput.queName, {
  ...workerInput.queueOptions,
});

const moduleMapQueEvents = new QueueEvents(workerInput.queName, {
  ...workerInput.queueOptions,
});

logger.silly(`Testing`, {
  moduleMapQueEvents,
});

interface ModuleMap {
  filePath: string;

  importedModules: string[];
}

async function discoverModuleMap(
  moduleInput: ModuleMapWorkerJobInput,
): Promise<ModuleMap> {
  logger.debug(`discoverModuleMap()`, {
    params: moduleInput,
  });

  const rootDir = dirname(moduleInput.filePath);

  const tsConfig = getTSConfig(moduleInput.filePath);
  const defaultOptions = ts.getDefaultCompilerOptions();
  const options = { ...defaultOptions, ...tsConfig };

  const compilierHost = ts.createCompilerHost({
    ...options,
    rootDir,
  });

  const compilerProgram = ts.createProgram({
    rootNames: [moduleInput.filePath],
    options: {
      ...options,
      jsxFragmentFactory: 'Fragment',
    },
    host: compilierHost,
  });

  const sourceFile = compilerProgram.getSourceFile(moduleInput.filePath);

  if (!sourceFile) {
    throw new Error('Invalid Source File');
  }

  const resolvedArray = Array.from(sourceFile.resolvedModules);

  const importedModules = await Promise.all(
    resolvedArray.map(async ([specifier]) => {
      const parentURI = pathToFileURL(moduleInput.filePath);

      logger.silly(`Resolving Module`, {
        specifier,
        parentURI,
      });

      const resolvePathURI = await import.meta.resolve(
        specifier,
        parentURI.href,
      );

      logger.silly(`Resolved moduleURI`, {
        specifier,
        parentURI,
        resolvePathURI,
      });

      const filePath = fileURLToPath(resolvePathURI);

      let moduleSpecifier: string;
      if (ts.isExternalModuleNameRelative(specifier)) {
        logger.silly(`Specifier is relative`, {
          specifier,
          parentURI,
          resolvePathURI,
        });

        moduleSpecifier = filePath;
      } else {
        logger.silly(`Specifier isn't relative`, {
          specifier,
          parentURI,
          resolvePathURI,
        });

        moduleSpecifier = specifier;
      }

      logger.silly(`Adding module to Que`, {
        specifier,
        parentURI,
        resolvePathURI,
      });
      await moduleMapQue.add(
        workerInput.queName,
        plainToClass(ModuleMapWorkerJobInput, {
          filePath,
          specifier: moduleSpecifier,
        }),
        {
          jobId: filePath,
        },
      );

      return filePath;
    }),
  );

  return {
    filePath: moduleInput.filePath,
    importedModules,
  };
}

const moduleWorker = new Worker<ModuleMapWorkerJobInput, ResolvedModuleMap>(
  workerInput.queName,
  async (job) => {
    logger.info(`Recieved a task for moduleWorker`, {
      worker: 'moduleWorker',
    });

    logger.debug(`Task input`, {
      worker: 'moduleWorker',
      jobInput: job.data,
    });

    const jobInput = plainToClass(ModuleMapWorkerJobInput, job.data);

    logger.debug(`Transformed job.data to Class`, {
      worker: 'moduleWorker',
      objectName: 'jobInput',
      jobInput,
    });

    await validateOrReject(jobInput);

    logger.debug(`Validated jobInput`, {
      worker: 'moduleWorker',
      jobInput,
    });

    logger.debug(`Returning promise of discoverModuleMap`, {
      worker: 'moduleWorker',
    });

    return discoverModuleMap(jobInput);
  },
  {
    connection: workerInput.queueOptions.connection,
    concurrency: 2,
  },
);

logger.silly(`Created moduleWorker`, {
  objectName: 'moduleWorker',
  moduleWorker,
});
