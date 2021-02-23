// src/Modules/Files/processModule.ts

import { logger } from '../../Library/Logger';
import {
  exportsHandler,
  objectExport,
  processNodeReplacement,
} from '../TypeScript/Regex';

export function processModule(fileContents: string): string {
  const exportVars: string[] = [];

  logger.silly(`processModule`, {
    fileContents,
  });

  /**
   * https://regex101.com/r/uwAq1N/1
   */

  let moduleContents = fileContents
    .replace(processNodeReplacement, '$<coreCode>')
    .replaceAll(exportsHandler, (test, todo, varName) => {
      exportVars.push(varName);
      logger.silly(`exportVars:`, { varName });

      return `var ${varName as string}`;
    })
    .replace(objectExport, (...args) => {
      const { coreCode } = args[args.length - 1];

      return coreCode.replaceAll('exports.', '');
    });

  exportVars.map((exportVar) => {
    moduleContents = moduleContents.replaceAll(
      `exports.${exportVar}`,
      `${exportVar}`,
    );

    moduleContents += `exports.${exportVar} = ${exportVar}\n`;
  });

  return moduleContents;
}
