// src/Modules/TypeScript/TypeScriptModuleMapWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { plainToClass } from 'class-transformer';
import { Queue, Worker } from 'bullmq';
import { logger as coreLogger } from '../../Library/Logger';
import { WorkerInput } from './WorkerInput';
import { validateOrReject } from 'class-validator';
import { threadId } from 'worker_threads';
import * as ts from 'typescript';
import { ModuleMapWorkerJobInput } from './ModuleMapWorkerJobInput';
import { dirname } from 'path';
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

// const moduleMapQueEvents = new QueueEvents(workerInput.queName, {
//   ...workerInput.queueOptions,
// });

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
  const defaultOptions = ts.getDefaultCompilerOptions();
  const options: ts.CompilerOptions = {
    ...defaultOptions,
    jsxFragmentFactory: 'Fragment',
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowJs: true,
    checkJs: false,
    noEmit: true,
    noEmitHelpers: true,
    sourceMap: false,
    inlineSourceMap: false,
  };

  const compilierHost = ts.createCompilerHost({
    ...options,
    rootDir,
  });

  const compilerProgram = ts.createProgram({
    rootNames: [moduleInput.filePath],
    options: {
      ...options,
    },
    host: compilierHost,
  });

  const sourceFile = compilerProgram.getSourceFile(moduleInput.filePath);

  if (!sourceFile) {
    throw new Error('Invalid Source File');
  }

  logger.silly(`sourceFile: `, {
    objectName: 'sourceFile',
    sourceFile: sourceFile.fileName,
  });

  const resolvedArray = Array.from(
    sourceFile.resolvedModules ?? new Map<string, ts.ResolvedModuleFull>([]),
  );

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

      if (resolvePathURI.startsWith('node:')) {
        logger.debug(`resolvePathURI is a node: path`, {
          objectName: 'resolvePathURI',
          resolvePathURI,
        });
        return;
      }

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

      const jobData = plainToClass(ModuleMapWorkerJobInput, {
        filePath,
        specifier: moduleSpecifier,
      });

      logger.debug(`newJobData: `, {
        jobData,
        jobId: filePath,
      });

      const job = await moduleMapQue.add(workerInput.queName, jobData, {
        jobId: filePath,
        lifo: true,
      });

      logger.silly(`Testing123...`, {
        test: job.id,
      });

      // const output = await job.waitUntilFinished(moduleMapQueEvents);
      // logger.info(`output shit: `, {
      //   output,
      // });

      return filePath;
    }),
  );

  logger.silly(`discoverModuleMap(${JSON.stringify(moduleInput)})`);

  return {
    filePath: moduleInput.filePath,
    importedModules: importedModules.filter(Boolean) as string[],
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
    concurrency: 6,
  },
);

logger.silly(`Created moduleWorker`, {
  objectName: 'moduleWorker',
  moduleWorker,
});
