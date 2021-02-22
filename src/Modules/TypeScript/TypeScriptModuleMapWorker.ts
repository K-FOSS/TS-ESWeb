// src/Modules/TypeScript/TypeScriptModuleMapWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import { Queue, Worker } from 'bullmq';
import { dirname } from 'path';
import * as ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'url';
import { threadId } from 'worker_threads';
import { logger as coreLogger } from '../../Library/Logger';
import { envMode } from '../../Utils/Environment';
import '../../Utils/Setup';
import { WorkerInput } from '../Queues/WorkerInput';
import { WebModuleJobInput } from '../WebModule/WebModuleJobInput';
import { ModuleMapWorkerJobInput } from './ModuleMapWorkerJobInput';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';
import { createTypeScriptProgram, isCommonJSImportSplit } from './Utils';

const logger = coreLogger.child({
  labels: { worker: 'TypeScriptModuleMapWorker.ts', workerId: threadId },
});

logger.info(`Worker starting`);

const workerInput = await WorkerInput.createWorkerInput(
  getWorkerData(import.meta.url),
);

logger.silly(`workerInput`, {
  workerInput,
});

const webModuleQue = new Queue('webModuleQueue', {
  ...workerInput.queueOptions,
});

const transpilerQue = new Queue('typescriptTranspiler', {
  ...workerInput.queueOptions,
});

const moduleMapQue = new Queue(workerInput.queName, {
  ...workerInput.queueOptions,
});

/**
 * Discover all imported modules and add to the TypeScript Module Map
 * @param moduleInput Input Params
 * @returns Promise resolving to void once completed
 */
async function discoverModuleMap(
  moduleInput: ModuleMapWorkerJobInput,
): Promise<void> {
  const moduleMapLogger = logger.child({
    labels: {
      filePath: moduleInput.filePath,
      worker: 'TypeScriptModuleMapWorker.ts',
      workerId: threadId,
    },
  });

  moduleMapLogger.debug(`discoverModuleMap()`, {
    params: moduleInput,
  });

  const rootDir = dirname(moduleInput.filePath);

  const compilerProgram = await createTypeScriptProgram({
    rootDir,
    rootNames: [moduleInput.filePath],
    compilerOptions: {
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
    },
  });

  moduleMapLogger.silly(`compilerProgram created`, {
    rootDir,
    rootNames: [moduleInput.filePath],
    compilerOptions: {
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
    },
  });

  const sourceFile = compilerProgram.getSourceFile(moduleInput.filePath);

  if (!sourceFile) {
    throw new Error('Invalid Source File');
  }

  moduleMapLogger.silly(`sourceFile: `, {
    objectName: 'sourceFile',
    sourceFile: sourceFile.fileName,
  });

  const resolvedArray = Array.from(
    sourceFile.resolvedModules ?? new Map<string, ts.ResolvedModuleFull>([]),
  );

  moduleMapLogger.silly(`resolvedArray`, {
    resolvedArray,
  });

  if (isCommonJSImportSplit(resolvedArray) && moduleInput.specifier) {
    moduleMapLogger.silly(`Module has two resolvedModules`, {
      resolvedArray,
      moduleInput,
      specifier: moduleInput.specifier,
    });

    try {
      const [, outputModule] = resolvedArray.reduce(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        // eslint-disable-next-line array-callback-return
        (_test, [_filePath, resolvedModule]) => {
          if (resolvedModule.packageId?.subModuleName.includes(envMode)) {
            return [_filePath, resolvedModule];
          }
        },
      );

      moduleMapLogger.silly(`HelloWorld`, {
        outputModule,
      });

      const jobData = await ModuleMapWorkerJobInput.createModuleMapJobInput({
        filePath: outputModule.resolvedFileName,
        specifier: moduleInput.specifier,
      });

      moduleMapLogger.silly('Output real module: ', {
        outputModule,
        jobData,
        specifier: moduleInput.specifier,
      });

      await moduleMapQue.add(workerInput.queName, jobData, {
        jobId: outputModule.resolvedFileName,
      });

      return;
    } catch (err) {
      moduleMapLogger.error('Error during reduce', {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        err,
      });
    }
  }

  moduleMapLogger.silly('Fucker');

  const importedModules = await Promise.all(
    resolvedArray.map(async ([specifier]) => {
      const parentURI = pathToFileURL(moduleInput.filePath);

      moduleMapLogger.silly(`Resolving Module`, {
        specifier,
        parentURI,
      });

      const resolvePathURI = await import.meta.resolve(
        specifier,
        parentURI.href,
      );

      if (resolvePathURI.startsWith('node:')) {
        moduleMapLogger.debug(`resolvePathURI is a node: path`, {
          objectName: 'resolvePathURI',
          resolvePathURI,
        });
        return;
      }

      moduleMapLogger.silly(`Resolved moduleURI`, {
        specifier,
        parentURI,
        resolvePathURI,
      });

      const filePath = fileURLToPath(resolvePathURI);

      let moduleSpecifier: string;
      if (ts.isExternalModuleNameRelative(specifier)) {
        moduleMapLogger.silly(`Specifier is relative`, {
          specifier,
          parentURI,
          resolvePathURI,
        });

        moduleSpecifier = filePath;
      } else {
        moduleMapLogger.silly(`Specifier isn't relative`, {
          specifier,
          parentURI,
          resolvePathURI,
        });

        moduleSpecifier = specifier;
      }

      moduleMapLogger.silly(`Adding module to Que`, {
        specifier,
        parentURI,
        resolvePathURI,
      });

      const jobData = await ModuleMapWorkerJobInput.createModuleMapJobInput({
        filePath,
        specifier: moduleSpecifier,
      });

      moduleMapLogger.debug(`newJobData: `, {
        jobData,
        jobId: filePath,
      });

      /**
       * TODO: Add dep to moduleMap
       */

      const job = await moduleMapQue.add(workerInput.queName, jobData, {
        jobId: filePath,
      });

      return job.id;
    }),
  );

  const webModuleJobInputParams: WebModuleJobInput = {
    filePath: moduleInput.filePath,
    specifier: moduleInput.specifier,
    importedModules: importedModules.filter(Boolean) as string[],
  };

  moduleMapLogger.silly(`webModuleJobInputParams`, {
    webModuleJobInputParams,
  });

  const [webModuleJobInput, transpilerJobInput] = await Promise.all([
    WebModuleJobInput.createWebModuleJobInput(webModuleJobInputParams),
    TranspilerWorkerJobInput.createTranspilerWorkerJobInput({
      filePath: moduleInput.filePath,
    }),
  ]);

  moduleMapLogger.silly(`discoverModuleMap(${JSON.stringify(moduleInput)})`, {
    webModuleJobInput,
  });

  await Promise.all([
    webModuleQue.add('webModuleQueue', webModuleJobInput),
    transpilerQue.add('typescriptTranspiler', transpilerJobInput),
  ]);
}

const moduleWorkerLogger = logger.child({
  worker: 'moduleWorker',
});

const moduleWorker = new Worker<ModuleMapWorkerJobInput>(
  workerInput.queName,
  async (job) => {
    if (moduleWorkerLogger.isSillyEnabled()) {
      moduleWorkerLogger.silly(`Task recieved`, {
        jobInput: job.data,
      });
    } else {
      moduleWorkerLogger.info(`Recieved a task for moduleWorker`);
    }

    const jobInput = await ModuleMapWorkerJobInput.createModuleMapJobInput(
      job.data,
    );

    moduleWorkerLogger.silly(`Transformed job.data to Class`, {
      objectName: 'jobInput',
      jobInput,
    });

    await discoverModuleMap(jobInput);
  },
  {
    connection: workerInput.queueOptions.connection,
  },
);

logger.silly(`Created moduleWorker`, {
  objectName: 'moduleWorker',
  moduleWorker,
});
