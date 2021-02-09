// src/Utils/moduleFileFinder.ts
import { TestSuite } from '@k-foss/ts-estests';
import { logger } from '../Library/Logger';
import { findModuleFiles } from './moduleFileFinder';
import { resolvePath } from './resolvePath';

interface ConstModule {
  [key: string]: string;
}

export class ModuleFileFinderSuite extends TestSuite {
  public testName = 'Module File Finder Test Suite';

  public async test(): Promise<void> {
    const constModules = await findModuleFiles<ConstModule>(
      /.*Const\.(ts|js)x?/,
      resolvePath('./fixtures/ConstModules/Modules', import.meta.url),
    );

    logger.debug(`ModuleFileFinderSuite test() constModules: `, constModules);

    // deepStrictEqual(
    //   constModules[0]?.helloWorld,
    //   'test1',
    //   'constModules[0]?.helloWorld === test1',
    // );

    // deepStrictEqual(
    //   constModules[0]?.helloWorld,
    //   'test2file1const1',
    //   'constModules[1]?.helloWorld === test1',
    // );
  }
}
