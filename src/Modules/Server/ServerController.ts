// src/Modules/Server/ServerController.ts
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import hyperid from 'hyperid';
import { Container, Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { RedisController } from '../Redis/RedisController';
import { RedisType } from '../Redis/RedisTypes';
import { TypeScriptController } from '../TypeScript/TypeScriptController';
import { WebModuleController } from '../WebModule/WebModuleController';
import { WebModuleJobInput } from '../WebModule/WebModuleJobInput';
import { WebModuleMapJobInput } from '../WebModule/WebModuleMapJobInput';
import { ServerOptions, serverOptionsToken } from './ServerOptions';

@Service()
export class ServerController {
  public redisController: RedisController;

  // eslint-disable-next-line no-useless-constructor
  public constructor(
    private typescriptController: TypeScriptController,
    private webModuleController: WebModuleController,
    @Inject(serverOptionsToken)
    public options: ServerOptions,
  ) {
    this.redisController = new RedisController({
      host: options.redis.host,
    });
  }

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

  public async getModuleMap(filePath: string): Promise<WebModuleMapJobInput> {
    const result = await this.redisController.getValue(
      RedisType.MODULE_MAP,
      filePath,
    );

    if (typeof result === 'string') {
      return plainToClass(WebModuleJobInput, JSON.parse(result));
    }

    throw new Error('Invalid result from Redis');
  }

  public async getPathModule(filePath: string): Promise<void> {
    logger.silly('HelloWorld');

    const result = await this.redisController.getValue(
      RedisType.MODULE,
      filePath,
    );

    logger.silly(`getPath(${filePath})`, {
      result,
    });
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

    const filePath = fileURLToPath(
      await import.meta.resolve('../../Web_Test/Imports.ts'),
    );

    const entrypointJob = await this.typescriptController.createModuleMapTask({
      filePath,
    });
    logger.silly(`entrypointJob`, {
      entrypointJob,
    });

    await this.typescriptController.waitForTranspileDone();

    logger.silly('Done');

    await this.getPathModule(filePath);
    await this.getPathModule(
      '/workspace/node_modules/react-dom/cjs/react-dom.development.js',
    );

    const value = await this.getModuleMap(
      '/workspace/node_modules/react-dom/server.js',
    );
    logger.debug('React-DOM Server', {
      value,
    });

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
