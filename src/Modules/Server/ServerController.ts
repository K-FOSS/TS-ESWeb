// src/Modules/Server/ServerController.ts
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import hyperid from 'hyperid';
import { Container, Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { TypeScriptController } from '../TypeScript/TypeScriptController';
import { WebModuleController } from '../WebModule/WebModuleController';
import { ServerOptions, serverOptionsToken } from './ServerOptions';

@Service()
export class ServerController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  // eslint-disable-next-line no-useless-constructor
  public constructor(
    private typescriptController: TypeScriptController,
    private webModuleController: WebModuleController,
  ) {}

  /**
   * Create a new ServerController with the provided Configuration within the TypeDi Container
   * @param options Server Configuration
   * @param container Optional TypeDi Container defaults to `Container.of()`
   * @returns Promise resolving to newly configured ServerController class
   */
  public static async createServer(
    options: Partial<ServerOptions>,
  ): Promise<ServerController> {
    logger.info(`ServerController.createServer()`);

    const serverId = hyperid().uuid;

    const container = Container.of(serverId);

    const serverOptions = plainToClass(ServerOptions, {
      ...options,
      serverId,
    });
    await validateOrReject(serverOptions);

    container.set({
      id: serverOptionsToken,
      global: true,
      value: serverOptions,
    });

    return container.get(ServerController);
  }

  public async startTypeScript(): Promise<void> {
    logger.info(
      `ServerController.startTypeScript() starting TypeScript Module Map`,
    );

    await Promise.all([
      this.typescriptController.createModuleMapWorkers(),
      this.webModuleController.spawnWebModuleWorkers(),
      this.typescriptController.createTranspilerWorkers(),
    ]);

    const entrypointJob = await this.typescriptController.createModuleMapTask({
      filePath: fileURLToPath(
        await import.meta.resolve('../../Web_Test/Imports.ts'),
      ),
    });

    await this.typescriptController.waitForModuleMapDone();

    await this.typescriptController.waitForJob(entrypointJob);

    // const typescriptController = this.typescriptController;

    // async function getAllChildModules(filePath: string): Promise<string[]> {
    //   const job = await typescriptController.getModuleMap(filePath);

    //   const fullModules = [...job.importedModules];

    //   const childModules = job.importedModules ?? [];

    //   for (const importedModule of childModules) {
    //     if (importedModule === null) {
    //       continue;
    //     }

    //     fullModules.push(...(await getAllChildModules(importedModule)));
    //   }

    //   return [filePath, ...fullModules];
    // }

    // const moduleFiles = await getAllChildModules(jobOutput.filePath);
  }
}
