// src/Modules/Files/processModule.ts
import { isString } from 'class-validator';
import { logger } from '../../Library/Logger';
import {
  exportsHandler,
  objectExport,
  processNodeIfStatement,
  processNodeReplacement,
} from '../TypeScript/Regex';

export function processModule(fileContents: string): string {
  const exportVars: string[] = [];

  const processLogger = logger.child({
    function: `processModule`,
  });

  processLogger.silly(`Processing module`, {
    fileContents,
  });

  let moduleContents: string = fileContents;

  function setModuleContents(newValue: string, actionLabel?: string): void {
    processLogger.silly(`setModuleContents`, {
      newValue,
      actionLabel,
    });

    moduleContents = newValue;
  }

  setModuleContents(
    moduleContents.replace(processNodeReplacement, '$<coreCode>'),
    'processNodeReplacement',
  );

  setModuleContents(
    moduleContents.replace(processNodeIfStatement, '$<coreCode>'),
    'processNodeENVIfStatement',
  );

  setModuleContents(
    moduleContents.replaceAll(
      exportsHandler,
      (_test, _todo, varName: string) => {
        exportVars.push(varName);
        return `var ${varName}`;
      },
    ),
    'exportsHandler',
  );

  setModuleContents(
    moduleContents.replace(objectExport, (...args) => {
      const obj = args[args.length - 1] as { coreCode: string };

      if (isString(obj.coreCode)) {
        return obj.coreCode.replaceAll('exports.', '');
      }

      throw new Error('Invalid object replacement coreCode');
    }),
    'objectExport',
  );

  setModuleContents(
    moduleContents.replaceAll('process.env.NODE_ENV', process.env.NODE_ENV),
  );

  /**
   * https://regex101.com/r/uwAq1N/1
   */

  exportVars.forEach((exportVar) => {
    moduleContents = moduleContents.replaceAll(
      `exports.${exportVar}`,
      `${exportVar}`,
    );

    moduleContents += `exports.${exportVar} = ${exportVar}\n`;
  });

  return moduleContents;
}
