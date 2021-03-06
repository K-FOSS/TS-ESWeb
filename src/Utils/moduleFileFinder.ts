// src/Utils/moduleFileFinder.ts
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../Library/Logger';
import { resolvePath } from './resolvePath';

type FileMatcher = RegExp;

const coreModulesDir = resolvePath('../Modules', import.meta.url);

/**
 * Finds module files that match the fileMatcher
 * @param
 */
export async function findModuleFiles<T>(
  fileMatcher: FileMatcher,
  rootDir: string = coreModulesDir,
): Promise<T[]> {
  const timerKey = `findModuleFiles-${rootDir}`;

  console.time(timerKey);
  logger.debug(`findModuleFiles(${fileMatcher}, ${rootDir})`);

  async function processDirectory(directoryPath: string): Promise<T[]> {
    const directoryContents = await fs.readdir(directoryPath, {
      encoding: 'utf-8',
      withFileTypes: true,
    });

    return Promise.all(
      directoryContents.flatMap((directoryContent) => {
        const contentPath = resolve(directoryPath, directoryContent.name);

        if (directoryContent.isDirectory()) {
          return processDirectory(contentPath);
        }

        if (fileMatcher.test(directoryContent.name) === true) {
          return import(pathToFileURL(contentPath).href) as Promise<T>;
        }

        return [];
      }),
    );
  }

  const results = await processDirectory(rootDir);

  const flatResults = results.flat(50);

  console.timeEnd(timerKey);

  return flatResults;
}
