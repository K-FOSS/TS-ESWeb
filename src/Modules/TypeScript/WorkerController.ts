// src/Server/Modules/TypeScript/WorkerController.ts
import { spawnWorker } from '@k-foss/ts-worker';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { BaseEventEmitter } from '../../Utils/Events';
import { HMR } from '../HMR';
import { WebModule } from '../WebModule';
import { webModuleController } from '../WebModule/WebModuleController';
import {
  TranspileWorkerMessage,
  TranspileWorkerMessageType,
} from './WorkerMessages';

interface WorkerControllerEventMap {
  fileTranspiled: unknown;
  done: boolean;
}

interface WorkerThread {
  workerThread: Worker;

  ready: boolean;

  online: boolean;
}

interface SpawnWorkersOptions {
  cache: boolean;
}

export class WorkerController extends BaseEventEmitter<WorkerControllerEventMap> {
  public workers: WorkerThread[] = [];
  public started = false;
  public cache = true;

  public get threads(): number {
    return this.workers.length;
  }

  public get lazyWorkers(): WorkerThread[] {
    return this.workers.filter(
      ({ ready, online }) => ready === true && online === true,
    );
  }

  public get lazyThreads(): number {
    return this.lazyWorkers.length;
  }

  private pathHistory = new Set<string>();
  private jobQue = new Set<string>();

  public static async spawnWorkers(
    threadCount: number,
    { cache } = { cache: true } as SpawnWorkersOptions,
  ): Promise<WorkerController> {
    const controller = new WorkerController();
    controller.cache = cache;

    const workerModulePath = await import.meta.resolve(
      './transpileWorker',
      import.meta.url,
    );

    for (const _workerThread of Array(threadCount).fill(0)) {
      const worker = spawnWorker(fileURLToPath(workerModulePath), {});
      controller.workers.push({
        workerThread: worker,
        online: false,
        ready: false,
      });

      worker.on('online', () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const workerThread = controller.workers.find(
          ({ workerThread }) => workerThread.threadId === worker.threadId,
        )!;
        workerThread.ready = true;
        workerThread.online = true;
      });

      worker.on('message', controller.handleWorkerMessage(worker));

      controller.on('done', () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        if (controller.cache) worker.terminate();
      });
    }

    return controller;
  }

  public addJob(filePath: string): void {
    if (this.pathHistory.has(filePath)) {
      return;
    } else if (this.jobQue.has(filePath)) {
      return;
    } else if (webModuleController.getModule(filePath)) {
      return;
    }

    this.jobQue.add(filePath);
    this.pathHistory.add(filePath);
  }

  public handleWorkerMessage(
    worker: Worker,
  ): (msg: TranspileWorkerMessage) => void {
    return (msg): void => {
      switch (msg.type) {
        case TranspileWorkerMessageType.PUSH_DEPENDENCY:
          if (this.started === false) this.started = true;

          console.log(`Added: ${msg.filePath}`);

          this.addJob(msg.filePath);

          break;
        case TranspileWorkerMessageType.PUSH_HMR:
          HMR.watchedFiles.add(msg.filePath);

          break;
        case TranspileWorkerMessageType.PUSH_OUTPUT:
          webModuleController.pushModule(
            msg.filePath,
            new WebModule({
              code: msg.outputCode,
              dependencies: new Set(),
              filePath: msg.filePath,
            }),
          );

          break;
        case TranspileWorkerMessageType.READY:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.workers.find(
            ({ workerThread }) => workerThread.threadId === worker.threadId,
          )!.ready = true;

          break;
      }
    };
  }

  public removeJob(filePath: string): void {
    this.jobQue.delete(filePath);
  }

  public forceAddJob(filePath: string): Promise<boolean> {
    this.jobQue.add(filePath);

    return new Promise((resolve) => {
      this.on('done', resolve);
    });
  }

  public startPolling(): void {
    webModuleController.on('newModule', (msg) => {
      if (this.jobQue.has(msg.filePath)) this.removeJob(msg.filePath);
    });

    const poll = setInterval(() => {
      const jobQueArray = Array.from(this.jobQue);

      if (this.lazyThreads > 0 && jobQueArray.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const lazyWorker = this.lazyWorkers.pop()!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const filePath = jobQueArray.pop()!;

        if (webModuleController.getModule(filePath) && this.cache) {
          this.removeJob(filePath);
          return;
        }

        this.removeJob(filePath);
        lazyWorker.workerThread.postMessage(filePath);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.workers.find(
          ({ workerThread }) =>
            workerThread.threadId === lazyWorker.workerThread.threadId,
        )!.ready = false;
      }

      if (this.lazyThreads === this.threads && this.started === true) {
        this.emit('done', true);
        if (this.cache) {
          clearInterval(poll);
        }
      }
    }, 500);
  }

  /**
   * Starts transpiling a module graph starting with the entry
   * @param entrypoint Path to entryfile
   */
  public async start(filePath: string): Promise<boolean> {
    this.addJob(filePath);

    this.startPolling();

    return new Promise((resolve) => {
      if (this.cache) this.on('done', resolve);
    });
  }
}
