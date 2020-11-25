// src/Server/Modules/HMR/HMR.ts
import { BaseEventEmitter } from '../../Utils/Events';
import type { PathLike } from 'fs';
import { debounce } from '../../Utils/debounce';
import { WorkerController } from '../TypeScript/WorkerController';

/**
 * HMR Class Event Map
 */
interface HMREventsMap {
  fileChanged: {
    filePath: PathLike;
  };

  moduleUpdated: string;
}

type WatchedFileEvents = 'change' | string;

/**
 * Hot Module Reload Controller Class
 * this controls the HMR features of this system
 */
class HMRController extends BaseEventEmitter<HMREventsMap> {
  /**
   * Files to be watched for changes, on file change event it is send to a
   * transpiler thread to be transpled and the module graph's entry is updated with the returned output code.
   */
  public watchedFiles = new Set<PathLike>();

  /**
   * Creates the fs watcher on all HMRed files
   */
  async createWatcher(): Promise<void> {
    const fs = await import('fs');

    const workerController = await WorkerController.spawnWorkers(2, {
      cache: false,
    });
    workerController.startPolling();

    Array.from(this.watchedFiles).map(async (filePath) => {
      const watcher = fs.watch(filePath);

      console.log(`Watching ${filePath}`);

      watcher.on(
        'change',
        debounce((eventType: WatchedFileEvents, fileName: string | Buffer) => {
          switch (eventType) {
            case 'change':
              this.emit('fileChanged', {
                filePath,
              });
          }
        }, 1500),
      );
    });

    this.on('fileChanged', async ({ filePath }) => {
      console.log(
        `Spawned threads. Starting jobs with ${filePath} as the entrypoint`,
      );

      workerController
        .forceAddJob(filePath.toString())
        .then(() => this.emit('moduleUpdated', filePath.toString()));
    });
  }
}

export const HMR = new HMRController();
