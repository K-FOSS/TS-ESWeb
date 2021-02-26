// src/Modules/TypeScript/TypeScriptModuleMapWorker.ts
import { Queue, Worker } from 'bullmq';
import { isString } from 'class-validator';
import { readFile } from 'fs/promises';
import { resolve } from 'node:path';
import { dirname } from 'path';
import Container from 'typedi';
import * as ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'url';
import { threadId } from 'worker_threads';
import { logger as coreLogger } from '../../Library/Logger';
import { QueueController } from '../Queues/QueueController';
import { queueToken } from '../Queues/QueueToken';
import { workerControllerToken } from '../Queues/WorkerController';
import { workerInputToken } from '../Queues/WorkerInput';
import { RedisController } from '../Redis/RedisController';
import { RedisType } from '../Redis/RedisTypes';
import { WebModuleMapJobInput } from '../WebModule/WebModuleMapJobInput';
import { ModuleMapWorkerJobInput } from './ModuleMapWorkerJobInput';
import { TranspilerWorkerJobInput } from './TranspilerWorkerJobInput';
import { createTypeScriptProgram, isCommonJSImportSplit } from './Utils';

const logger = coreLogger.child({
  labels: { worker: 'TypeScriptModuleMapWorker.ts', workerId: threadId },
});

logger.info(`Worker starting`, {
  labels: {
    worker: 'TypeScriptModuleMapWorker.ts',
    workerId: threadId,
  },
});

const queueController = Container.get(QueueController);

const workerController = Container.get(workerControllerToken);

const queueName = Container.get(queueToken);
const workerInput = Container.get(workerInputToken);

workerController.logger.silly(`workerInput`, {
  queueController,
  queueName,
});

const webModuleMapQue = new Queue('webModuleMapQueue', {
  ...workerInput.queueOptions,
});

const transpilerQue = new Queue('typescriptTranspiler', {
  ...workerInput.queueOptions,
});

const moduleMapQue = new Queue(queueName, {
  ...workerInput.queueOptions,
});

const redisController = Container.get(RedisController);

/**
 * Discover all imported modules and add to the TypeScript Module Map
 * @param moduleInput Input Params
 * @returns Promise resolving to void once completed
 */
async function discoverModuleMap(
  moduleInput: ModuleMapWorkerJobInput,
): Promise<void> {
  const moduleMapLogger = workerController.logger.child({
    labels: {
      filePath: moduleInput.filePath,
      worker: 'TypeScriptModuleMapWorker.ts',
      workerId: threadId,
      appName: 'TS-ESWeb',
    },
  });

  moduleMapLogger.debug(`discoverModuleMap()`, {
    params: moduleInput,
  });

  const rootDir = dirname(moduleInput.filePath);

  const compilerOptions: ts.CompilerOptions = {
    jsxFragmentFactory: 'Fragment',
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowJs: true,
    checkJs: false,
    noEmit: true,
    noEmitHelpers: true,
    noLib: true,
    isolatedModules: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    sourceMap: false,
    inlineSourceMap: false,
  };

  const compilerProgram = await createTypeScriptProgram({
    rootDir,
    rootNames: [moduleInput.filePath],
    compilerOptions,
  });

  moduleMapLogger.silly(`compilerProgram created`, {
    rootDir,
    rootNames: [moduleInput.filePath],
    compilerOptions,
  });
  if (
    moduleInput.filePath ===
    '/workspace/node_modules/@babel/runtime/helpers/extends/_index.mjs'
  ) {
    const transpilerJobInput = await TranspilerWorkerJobInput.createTranspilerWorkerJobInput(
      {
        filePath: moduleInput.filePath,
      },
    );

    await transpilerQue.add('typescriptTranspiler', transpilerJobInput, {
      jobId: transpilerJobInput.filePath,
    });

    const specifierCore = moduleInput.specifier || moduleInput.filePath;
    const specifier = specifierCore.replace(/.(js|ts)x?/, '');

    const webModuleJobInputParams: WebModuleMapJobInput = {
      filePath: moduleInput.filePath,
      specifier,
      importedModules: [],
    };

    await redisController.IORedis.set(
      redisController.getRedisKey(RedisType.MODULE_MAP, moduleInput.filePath),
      JSON.stringify(webModuleJobInputParams),
    );

    await redisController.IORedis.set(
      redisController.getRedisKey(RedisType.MODULE_MAP, specifier),
      JSON.stringify(webModuleJobInputParams),
    );

    return;
  }

  const sourceFile = compilerProgram.getSourceFile(moduleInput.filePath);

  if (!sourceFile) {
    throw new Error('Invalid Source File');
  }

  moduleMapLogger.silly(`sourceFile: `, {
    objectName: 'sourceFile',
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
          workerController.logger.silly(`resolvedArrayReduce`, {
            _filePath,
            resolvedModule,
            includes: workerInput.serverOptions.envMode,
            _test,
            specifier: moduleInput.specifier,
          });

          if (
            resolvedModule.packageId?.subModuleName.includes(
              workerInput.serverOptions.envMode,
            )
          ) {
            return [_filePath, resolvedModule];
          } else {
            return _test;
          }
        },
      );

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
        specifier: moduleInput.specifier,
      });
    }
  }

  const importedModules = await Promise.all(
    resolvedArray.map(async ([specifier, _test]) => {
      const parentURI = pathToFileURL(moduleInput.filePath);

      moduleMapLogger.silly(`Resolving Module`, {
        specifier,
        parentURI,
        _test,
      });

      const resolvePathURI = await import.meta.resolve(
        specifier,
        parentURI.href,
      );

      if (resolvePathURI.startsWith('node:')) {
        return;
      }

      moduleMapLogger.silly(`Resolved moduleURI`, {
        specifier,
        parentURI,
        resolvePathURI,
      });

      let filePath = fileURLToPath(resolvePathURI);

      const folderPath = dirname(filePath);

      let packageJSON;

      try {
        const file = await readFile(resolve(folderPath, 'package.json'));
        logger.silly('Package file', {
          file: file.toString(),
        });

        packageJSON = JSON.parse(file.toString());
      } catch (err) {}

      if (isString(packageJSON?.module)) {
        logger.silly(`Testing HelloWorld`, {
          moduleName: packageJSON.module,
          filePath: pathToFileURL(folderPath).href,
        });

        filePath = resolve(folderPath, packageJSON.module);
      }

      logger.silly('HelloWorld57678', {
        filePath,
        test1: compilerProgram.getSourceFile(filePath),
        packageJSON: packageJSON || 'test',
      });

      let moduleSpecifier: string;
      if (ts.isExternalModuleNameRelative(specifier)) {
        moduleSpecifier = filePath;
      } else {
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

      moduleMapLogger.silly(`newJobData: `, {
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

  const specifierCore = moduleInput.specifier || moduleInput.filePath;
  let specifier = specifierCore.replace(/\.(js|ts)x?/, '');

  const webModuleJobInputParams: WebModuleMapJobInput = {
    filePath: moduleInput.filePath,
    specifier,
    importedModules: importedModules.filter(Boolean) as string[],
  };

  moduleMapLogger.silly(`webModuleJobInputParams`, {
    webModuleJobInputParams,
  });

  const [webModuleJobInput, transpilerJobInput] = await Promise.all([
    WebModuleMapJobInput.createWebModuleJobInput(webModuleJobInputParams),
    TranspilerWorkerJobInput.createTranspilerWorkerJobInput({
      filePath: moduleInput.filePath,
    }),
  ]);

  moduleMapLogger.silly(`discoverModuleMap(${JSON.stringify(moduleInput)})`, {
    webModuleJobInput,
  });

  await redisController.IORedis.set(
    redisController.getRedisKey(RedisType.MODULE_MAP, moduleInput.filePath),
    JSON.stringify(webModuleJobInputParams),
  );

  await redisController.IORedis.set(
    redisController.getRedisKey(RedisType.MODULE_MAP, specifier),
    JSON.stringify(webModuleJobInputParams),
  );

  if (specifier.endsWith('/index')) {
    specifier = specifier.replace('/index', '');
  }

  await redisController.IORedis.set(
    redisController.getRedisKey(RedisType.MODULE_MAP, specifier),
    JSON.stringify(webModuleJobInputParams),
  );

  await webModuleMapQue.add('webModuleMapQueue', webModuleJobInput, {
    jobId: webModuleJobInput.filePath,
  });

  workerController.logger.silly(`Creating Transpiler Task`, {
    jobId: transpilerJobInput.filePath,
    transpilerJobInput,
    specifier,
  });

  await transpilerQue.add('typescriptTranspiler', transpilerJobInput, {
    jobId: transpilerJobInput.filePath,
  });
}

const moduleWorkerLogger = workerController.logger.child({
  worker: 'moduleWorker',
  labels: {
    appName: 'TS-ESWeb',
    worker: 'moduleWorker',
  },
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

workerController.logger.silly(`Created moduleWorker`, {
  objectName: 'moduleWorker.name',
  value: moduleWorker.name,
});
