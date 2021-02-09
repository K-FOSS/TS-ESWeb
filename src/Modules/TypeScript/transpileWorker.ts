// src/Server/Utils/Workers/transpileWorker.ts
import { readFileSync } from 'fs';
import { dirname } from 'path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'url';
import { parentPort } from 'worker_threads';
import { logger } from '../../Library/Logger';
import { getTransformers } from '../../Library/Transformers';
import { exportsHandler, objectExport, processNodeReplacement } from './Regex';
import { getTSConfig } from './TSConfig';
import {
  TranspileWorkerMessage,
  TranspileWorkerMessageType,
} from './WorkerMessages';

if (parentPort === null) {
  throw new Error(`Worker does not have parentPort open`);
}

/**
 * Send the Worker ready for new file message to the Worker Controller
 */
function sendReady(): void {
  if (parentPort === null) {
    throw new Error(`Worker does not have parentPort open`);
  }

  return parentPort.postMessage({
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
  const defaultOptions = ts.getDefaultCompilerOptions();
  const options = { ...defaultOptions, ...tsConfig };

  const compilierHost = ts.createCompilerHost({
    ...options,
    rootDir,
  });

  const webModulePromises: Promise<void>[] = [];

  compilierHost.readFile = (fileName: string): string => {
    const fileContents = readFileSync(fileName);

    const exportVars: string[] = [];

    /**
     * https://regex101.com/r/uwAq1N/1
     */

    let moduleContents = fileContents
      ?.toString()
      .replace(processNodeReplacement, '$<coreCode>')
      .replaceAll(exportsHandler, (test, todo, varName) => {
        exportVars.push(varName);

        return `var ${varName}`;
      })
      .replace(objectExport, (...args) => {
        const { coreCode } = args[args.length - 1];

        return coreCode.replaceAll('exports.', '');
      });

    exportVars.map(
      (exportVar) =>
        (moduleContents += `exports.${exportVar} = ${exportVar}\n`),
    );

    return moduleContents;
  };

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
            outputCode: contents.replaceAll('exports.', ''),
          } as TranspileWorkerMessage);

          if (sourceFile.resolvedModules) {
            for (const [moduleName] of sourceFile.resolvedModules) {
              const moduleURLPath = await import.meta.resolve(
                moduleName,
                pathToFileURL(sourceFile.fileName).href,
              );

              logger.debug(
                `transpilerWorker.ts resolvedModuleURL: ${moduleURLPath}`,
              );

              if (moduleURLPath.startsWith('node:')) {
                continue;
              }
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
    options: {
      ...options,
      jsxFragmentFactory: 'Fragment',
    },
    host: compilierHost,
  });
  compilerProgram.emit(
    undefined,
    undefined,
    undefined,
    undefined,
    await getTransformers(compilerProgram),
  );

  return Promise.all(webModulePromises);
}

parentPort.on('message', (filePath: string) => {
  transpilePath(filePath)
    .then(sendReady)
    .catch((err) => {
      console.error('Transpile has errorer', err);
    });
});

sendReady();
