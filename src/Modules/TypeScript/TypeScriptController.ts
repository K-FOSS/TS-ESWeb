// src/Modules/TypeScript/TypeScriptController.ts
import { Inject, Service } from 'typedi';
import { logger } from '../../Library/Logger';
import { timeout } from '../../Utils/timeout';
import { Queue } from '../Ques/Que';

@Service()
export class TypeScriptController {
  public constructor(private typescriptQue: Queue) {
    logger.info(`TypeScriptController.constructor()`, typescriptQue);

    typescriptQue.createQueue('typescriptTranspile')
  }

  public async createWorkers(): Promise<void> {
    logger.info(`TypeScriptController.createWorkers()`);

    await timeout(50);
  }
}
