// src/Modules/Server/ServerController.ts
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import hyperid from 'hyperid';
import { ContainerInstance, Service, Container, Inject } from 'typedi';
import { logger } from '../../Library/Logger';
import { TypeScriptController } from '../TypeScript/TypeScriptController';
import { ServerOptions, serverOptionsToken } from './ServerOptions';

@Service()
export class ServerController {
  @Inject(serverOptionsToken)
  public options: ServerOptions;

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
      `ServerController.startTypeScript() starting TypeScript Workers`,
    );

    const workers = await this.typescriptController.createWorkers();

    logger.debug(`ServerController.startTypeScript() workers: `, workers);

    const randomArray = [...Array(10).fill(0)];

    await Promise.all(
      randomArray.map(() => {
        logger.info(`Adding a task to workers`);

        return this.typescriptController.createTask('helloFucker');
      }),
    );

    logger.info('Done');
  }
}