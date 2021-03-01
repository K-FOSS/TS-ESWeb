// src/Modules/WebModule/WebModuleWorker.ts
import { Queue, Worker } from 'bullmq';
import { Container } from 'typedi';
import { threadId } from 'worker_threads';
import { logger } from '../../Library/Logger';
import '../../Utils/Setup';
import { timeout } from '../../Utils/timeout';
import { queueToken } from '../Queues/QueueToken';
import { workerControllerToken } from '../Queues/WorkerController';
import { workerInputToken } from '../Queues/WorkerInput';
import { RedisController } from '../Redis/RedisController';
import { WebModuleController } from './WebModuleController';
import { WebModuleJobInput } from './WebModuleJobInput';
import { WebModuleMapJobInput } from './WebModuleMapJobInput';
import { WebModuleReference } from './WebModuleReference';

const workerController = Container.get(workerControllerToken);
const queueName = Container.get(queueToken);
const workerInput = Container.get(workerInputToken);

const webModuleController = Container.get(WebModuleController);

workerController.logger.info(`Worker starting`, {
  worker: 'TypeScriptTranspilerWorker.ts',
  workeId: threadId,
});

workerController.logger.info(`Worker starting`);

const redisController = Container.get(RedisController);

workerController.logger.debug(`Retrieved workerData:`, {
  objectName: 'workerInput',
  workerInput,
});

const webModuleMapQue = new Queue(queueName, {
  ...workerInput.queueOptions,
});

workerController.logger.silly(`webModuleQue has been created`, {
  webModuleMapQue,
});

function getModuleAlias(filePath: string): string[] {
  const strippedFilePath = filePath.replace(/\.(js|ts)x?/, '');

  const aliases: string[] = [strippedFilePath];

  if (strippedFilePath.endsWith('/index')) {
    aliases.push(strippedFilePath.replace('/index', ''));
  }

  return aliases;
}

const moduleMapWorker = new Worker<WebModuleMapJobInput>(
  workerInput.queName,
  async (job) => {
    workerController.logger.silly(`New Web Module Map Job:`, {
      data: job.data,
    });

    const jobData = await WebModuleMapJobInput.createWebModuleJobInput(
      job.data,
    );

    const aliases = [...getModuleAlias(jobData.filePath), jobData.specifier];

    workerController.logger.silly(`webModule Aliases`, {
      aliases,
    });

    await Promise.all(
      aliases.filter(Boolean).map(async (alias) => {
        const webModuleAlias = await WebModuleReference.createWebModuleReference(
          {
            specifier: alias,
            webModuleId: jobData.filePath,
          },
        );
        return webModuleController.setWebModule(webModuleAlias);
      }),
    );

    logger.silly('Web Module Map jobData', {
      jobData,
    });

    await timeout(60);
  },
  {
    connection: workerInput.queueOptions.connection,
  },
);

workerController.logger.silly(`moduleMapWorker`, {
  moduleMapWorker,
});

const moduleWorker = new Worker<WebModuleMapJobInput>(
  'webModuleQueue',
  async (job) => {
    workerController.logger.silly(`New Web Module Job:`, {
      data: job.data.filePath,
    });

    const input = await WebModuleJobInput.createWebModuleJobInput(job.data);

    await redisController.IORedis.set(input.filePath, input.sourceText);
  },
  {
    connection: workerInput.queueOptions.connection,
  },
);

workerController.logger.silly(`moduleWorker`, {
  moduleWorker,
});
