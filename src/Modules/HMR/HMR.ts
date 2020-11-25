/* eslint-disable @typescript-eslint/no-misused-promises */
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
  public async createWatcher(): Promise<void> {
    const fs = await import('fs');

    const workerController = await WorkerController.spawnWorkers(2, {
      cache: false,
    });
    workerController.startPolling();

    Array.from(this.watchedFiles).map((filePath) => {
      const watcher = fs.watch(filePath);

      console.log(`Watching ${filePath.toString()}`);

      watcher.on(
        'change',
        debounce((eventType: WatchedFileEvents) => {
          switch (eventType) {
            case 'change':
              this.emit('fileChanged', {
                filePath,
              });
          }
        }, 1500),
      );

      return watcher;
    });

    this.on('fileChanged', async ({ filePath }) => {
      console.log(
        `Spawned threads. Starting jobs with ${filePath.toString()} as the entrypoint`,
      );

      return workerController
        .forceAddJob(filePath.toString())
        .then(() => this.emit('moduleUpdated', filePath.toString()));
    });
  }
}

export const HMR = new HMRController();
