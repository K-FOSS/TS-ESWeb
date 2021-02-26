// src/Modules/Server/ServerController.ts
import { ApolloServer } from 'apollo-server-fastify';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import hyperid from 'hyperid';
import { resolve } from 'node:path';
import { Container, Inject, Service } from 'typedi';
import { fileURLToPath } from 'url';
import { getGQLContext } from '../../Library/Context';
import { logger } from '../../Library/Logger';
import { buildGQLSchema, getResolvers } from '../../Library/Resolvers';
import { timeout } from '../../Utils/timeout';
import { RedisController } from '../Redis/RedisController';
import { RedisType } from '../Redis/RedisTypes';
import { SSRController } from '../SSR/SSRController';
import { TypeScriptController } from '../TypeScript/TypeScriptController';
import { WebModuleController } from '../WebModule/WebModuleController';
import { WebModuleJobInput } from '../WebModule/WebModuleJobInput';
import { WebModuleMapJobInput } from '../WebModule/WebModuleMapJobInput';
import { ServerOptions, serverOptionsToken } from './ServerOptions';

@Service()
export class ServerController {
  @Inject()
  public redisController: RedisController;

  @Inject()
  public ssrController: SSRController;

  // eslint-disable-next-line no-useless-constructor
  public constructor(
    private typescriptController: TypeScriptController,
    private webModuleController: WebModuleController,
    @Inject(serverOptionsToken)
    public options: ServerOptions,
  ) {}

  private getPath(relativePath: string): string {
    return resolve(this.options.ssr.webRoot, relativePath);
  }

  public async createApolloServer(): Promise<ApolloServer> {
    const resolvers = await getResolvers();

    const schema = await buildGQLSchema(
      resolvers,
      Container.of(this.options.serverId),
    );

    const gqlServer = new ApolloServer({
      schema,
      context: getGQLContext,
      introspection: true,
      playground: {
        settings: {
          'editor.theme': 'light',
          'general.betaUpdates': true,
        },
        workspaceName: 'TS-ESWeb',
      },
    });

    return gqlServer;
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

    const serverOptions = plainToClass(
      ServerOptions,
      {
        ...options,
        serverId,
      },
      {
        strategy: 'exposeAll',
      },
    );
    await validateOrReject(serverOptions);

    if (
      typeof serverOptions.ssr !== 'undefined' &&
      typeof options.ssr?.appComponent !== 'undefined'
    ) {
      serverOptions.ssr.appComponent = options.ssr.appComponent;
    }

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

  public async getPathModule(filePath: string): Promise<string> {
    logger.silly('HelloWorld');

    const result = await this.redisController.getValue(
      RedisType.MODULE,
      filePath,
    );

    return result as string;
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

    await this.typescriptController.createModuleMapTask({
      filePath,
    });
    logger.silly(`entrypointJob created`);

    await this.typescriptController.waitForTranspileDone();

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

  public async renderHTML(): Promise<string> {
    await timeout(10);

    const appHTML = this.ssrController.renderApp();

    return `<html>
    <head>
      <title>TS-ESWeb</title>
      <link rel="manifest" href="/WebManifest.json">
    </head>
    <body>
      <div id="app">${appHTML}</div>
      <script type="module">
      import { Workbox } from 'https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-window.prod.mjs';
  
      const wb = new Workbox('/Static/${this.getPath('ServiceWorker.ts')}', {
        scope: '/'
      });
  
      wb.addEventListener('activated', async (event) => {
        // 'event.isUpdate' will be true if another version of the service
        // worker was controlling the page when this version was registered.
        if (!event.isUpdate) {
          // If your service worker is configured to precache assets, those
          // assets should all be available now.
          // So send a message telling the service worker to claim the clients
          // This is the first install, so the functionality of the app
          // should meet the functionality of the service worker!
          wb.messageSW({ type: 'CLIENTS_CLAIM' });
        }
      });
  
      const channel = new BroadcastChannel('sw-messages');
      channel.addEventListener('message', event => {
        if (event.data.type === 'READY') {
          import('/Static/${this.getPath('Client.tsx')}')
        }
      });
  
      wb.register();
  
      window.wb = wb;
  
  
      wb.active.then(() => import('/Static/${this.getPath('Client.tsx')}'));
      </script>
    </body>
    </html>`;
  }
}
