// src/Modules/Server/ServerController.ts
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import hyperid from 'hyperid';
import { Service, Container, Inject } from 'typedi';
import { fileURLToPath } from 'url';
import { logger } from '../../Library/Logger';
import { TypeScriptController } from '../TypeScript/TypeScriptController';
import { ServerOptions, serverOptionsToken } from './ServerOptions';

@Service()
export class ServerController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

  // eslint-disable-next-line no-useless-constructor
  public constructor(private typescriptController: TypeScriptController) {}

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

    container.set(serverOptionsToken, serverOptions);

    return container.get(ServerController);
  }

  public async startTypeScript(): Promise<void> {
    logger.info(
      `ServerController.startTypeScript() starting TypeScript Module Map`,
    );

    await this.typescriptController.createModuleMapWorkers();
    await this.typescriptController.createTranspilerWorkers();

    console.log('Starting Module Task');

    await this.typescriptController.createModuleMapTask({
      filePath: fileURLToPath(
        await import.meta.resolve('../../Web_Test/Imports.ts'),
      ),
    });
  }
}
