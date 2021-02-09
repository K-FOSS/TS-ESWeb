// src/Server/Modules/TypeScript/WebCompiler.ts
import { cpus } from 'os';
import { logger } from '../../Library/Logger';
import { WorkerController } from './WorkerController';

interface TranspilerOptions {
  /**
   * Number of worker threads to spin up.
   */
  threadCount: number;
}

/**
 * Starts a Web Transpiler starting with the specified entrypoint
 * @param entryPath Client Entrypoint to App
 */
export async function startWebTranspiler(
  filePath: string,
  opts: TranspilerOptions = {
    threadCount: cpus().length - 1,
  },
): Promise<void> {
  const workerController = await WorkerController.spawnWorkers(
    opts.threadCount,
  );

  logger.info(
    `startWebTranspiler() Spawned threads. Starting jobs with ${filePath} as the entrypoint`,
  );

  await workerController.start(filePath);
}
