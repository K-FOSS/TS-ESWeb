// src/Library/Context.test.ts
import { TestSuite } from '@k-foss/ts-estests';
import { deepStrictEqual } from 'assert';
import { getGQLContext } from './Context';
import { logger } from './Logger';

export class ContextTestSuite extends TestSuite {
  public testName = 'Context Test Suite';

  public async test(): Promise<void> {
    logger.info(`Context Test Suite`);

    const context1 = await getGQLContext();

    deepStrictEqual(context1?.randomValue, 42, 'context1?.randomValue === 42');
  }
}
