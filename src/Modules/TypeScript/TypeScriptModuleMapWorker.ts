// src/Modules/TypeScript/TypeScriptModuleMapWorker.ts
import { getWorkerData } from '@k-foss/ts-worker';
import '../../Utils/Setup';
import { plainToClass } from 'class-transformer';
import { Worker } from 'bullmq';
import { logger } from '../../Library/Logger';
import { WorkerInput } from './WorkerInput';
import { validateOrReject } from 'class-validator';
import { RedisOptions } from '../Redis/RedisOptions';
import * as ts from 'typescript';
import { ModuleMapWorkerJobInput } from './ModuleMapWorkerJobInput';
import { dirname } from 'path';
import { getTSConfig } from './TSConfig';

const data = getWorkerData(import.meta.url);

logger.debug(`TypeScriptWorker`, data);

const workerInput = plainToClass(WorkerInput, <WorkerInput>{
  redisOptions: JSON.parse(data.redisOptions) as RedisOptions,
  queName: data?.queName as string,
});

logger.debug(`TypeScriptModuleMapWorker: `, workerInput);

await validateOrReject(workerInput);

async function discoverModuleMap(
  moduleInput: ModuleMapWorkerJobInput,
): Promise<string> {
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

  for (const [specifier, resovledModule] of sourceFile.resolvedModules) {
    console.log(
      `Resolved Module: specifier: ${specifier} resolved:`,
      resovledModule,
    );
  }

  return `console.log('helloWorld')`;
}

const transpilerWorker = new Worker<ModuleMapWorkerJobInput>(
  workerInput.queName,
  async (job) => {
    const jobInput = plainToClass(ModuleMapWorkerJobInput, job.data);

    await validateOrReject(jobInput);

    logger.info(`TypeScript Module Map Worker: filePath: ${jobInput.filePath}`);

    const transformedModule = await discoverModuleMap(jobInput);

    logger.debug(`transpilerWorker transformedModule: ${transformedModule}`);
  },
  {
    connection: {
      host: workerInput.redisOptions.hostname,
    },
    concurrency: 2,
  },
);

logger.debug(`TypeScriptTranspilerWorker.ts worker: `, transpilerWorker);
