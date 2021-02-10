// src/Modules/TypeScript/TypeScriptModuleMapWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { plainToClass } from 'class-transformer';
import { Queue, Worker } from 'bullmq';
import { logger } from '../../Library/Logger';
import { WorkerInput } from './WorkerInput';
import { validateOrReject } from 'class-validator';
import { RedisOptions } from '../Redis/RedisOptions';
import * as ts from 'typescript';
import { ModuleMapWorkerJobInput } from './ModuleMapWorkerJobInput';
import { dirname } from 'path';
import { getTSConfig } from './TSConfig';
import { fileURLToPath, pathToFileURL } from 'url';

const data = getWorkerData(import.meta.url);

const workerInput = plainToClass(WorkerInput, <WorkerInput>{
  redisOptions: JSON.parse(data.redisOptions) as RedisOptions,
  queName: data?.queName as string,
});

await validateOrReject(workerInput);

const moduleMapQue = new Queue(workerInput.queName, {
  connection: {
    host: workerInput.redisOptions.hostname,
  },
});

interface ModuleMap {
  filePath: string;

  importedModules: string[];
}

async function discoverModuleMap(
  moduleInput: ModuleMapWorkerJobInput,
): Promise<ModuleMap> {
  logger.debug(`discoverModuleMap(${JSON.stringify(moduleInput)})`);

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
      const resolvePathURI = await import.meta.resolve(
        specifier,
        pathToFileURL(moduleInput.filePath).href,
      );

      const filePath = fileURLToPath(resolvePathURI);

      await moduleMapQue.add(
        workerInput.queName,
        plainToClass(ModuleMapWorkerJobInput, {
          filePath,
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

const transpilerWorker = new Worker<ModuleMapWorkerJobInput>(
  workerInput.queName,
  async (job) => {
    const jobInput = plainToClass(ModuleMapWorkerJobInput, job.data);

    await validateOrReject(jobInput);

    logger.info(`TypeScript Module Map Worker: filePath: ${jobInput.filePath}`);

    return discoverModuleMap(jobInput);
  },
  {
    connection: {
      host: workerInput.redisOptions.hostname,
    },
    concurrency: 2,
  },
);

logger.debug(`TypeScriptTranspilerWorker.ts worker: `, transpilerWorker.name);
