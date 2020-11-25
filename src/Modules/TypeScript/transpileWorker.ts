// src/Server/Utils/Workers/transpileWorker.ts
import { parentPort } from 'worker_threads';
import { dirname } from 'path';
import {
  TranspileWorkerMessageType,
  TranspileWorkerMessage,
} from './WorkerMessages';
import ts from 'typescript';
import { getTSConfig } from './TSConfig';
import { pathToFileURL, fileURLToPath } from 'url';
import { getTransformers } from '../../Library/Transformers';

if (!parentPort) throw new Error(`Worker does not have parentPort open`);

/**
 * Send the Worker ready for new file message to the Worker Controller
 */
function sendReady(): void {
  parentPort?.postMessage({
    type: TranspileWorkerMessageType.READY,
  } as TranspileWorkerMessage);
}

/**
 * Transpile filePath to brower compatible code
 * @param filePath Path to file to Transpile
 */
async function transpilePath(filePath: string): Promise<void[]> {
  const rootDir = dirname(filePath);

  const tsConfig = getTSConfig(filePath);

  const options = ts.getDefaultCompilerOptions();

  const compilierHost = ts.createCompilerHost({
    ...options,
    rootDir,
  });

  const webModulePromises: Promise<void>[] = [];

  /**
   * Overwrite the TypeScript write file function so we can intercept the module data
   */
  compilierHost.writeFile = (
    _filePath,
    contents,
    _writeByteOrderMark,
    _onError,
    sourceFiles,
  ): void => {
    if (sourceFiles) {
      if (!sourceFiles[0]) {
        throw new Error('No inital source file. Issue with TS Compile');
      }

      webModulePromises.push(
        ...sourceFiles.map(async (sourceFile) => {
          parentPort?.postMessage({
            type: TranspileWorkerMessageType.PUSH_OUTPUT,
            filePath: sourceFile.fileName,
            outputCode: contents,
          } as TranspileWorkerMessage);

          if (sourceFile.resolvedModules) {
            for (const [moduleName] of sourceFile.resolvedModules) {
              const moduleURLPath = await import.meta.resolve(
                moduleName,
                pathToFileURL(sourceFile.fileName).href,
              );

              const modulePath = fileURLToPath(moduleURLPath);

              parentPort?.postMessage({
                type: TranspileWorkerMessageType.PUSH_DEPENDENCY,
                filePath: modulePath,
                specifier: moduleName,
              } as TranspileWorkerMessage);
            }
          }
        }),
      );
    }
  };

  const compilerProgram = ts.createProgram({
    rootNames: [filePath],
    options: tsConfig,
    host: compilierHost,
  });
  compilerProgram.emit(
    undefined,
    undefined,
    undefined,
    undefined,
    await getTransformers(compilerProgram),
  );

  console.log('Emitted program');

  return Promise.all(webModulePromises);
}

parentPort.on('message', (filePath: string) => {
  console.log(`transpiling path: ${filePath}`);

  transpilePath(filePath)
    .then(sendReady)
    .catch(() => {
      console.error('Testing');
    });
});

sendReady();
