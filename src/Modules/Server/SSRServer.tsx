// src/Modules/Server/SSRServer.ts
import fastify, { FastifyInstance } from 'fastify';
import { resolve } from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Container, { Service } from 'typedi';
import { createApolloServer } from '../../Library/Apollo';
import { getRoutes, Route } from '../../Library/Fastify';
import { logger } from '../../Library/Logger';
import { ReactFunction } from '../../Utils/React';
import { startWebTranspiler } from '../TypeScript';

export interface ClientOptions {
  appComponent: ReactFunction;

  /**
   * Root Directory for Web/Client
   *
   * @example
   * ```ts
   * webRoot: path.resolve('./Web')
   * ```
   */
  webRoot: string;

  /**
   * Entrypoint Path relative to @see webRoot
   */
  entrypoint: string;

  /**
   * Additional Fastify Routes
   */
  serverRoutes: Route[];
}

/**
 * TS-ESWeb SSR Server Controller
 */
@Service()
export class SSRServer {
  /**
   * Client Provided Options
   */
  public options: ClientOptions = {
    appComponent: () => <div>HelloWorld</div>,
    entrypoint: 'Imports.ts',
    webRoot: 'Web',
    serverRoutes: [],
  };

  public webServer: FastifyInstance = fastify();

  public get entrypoint(): string {
    return resolve(this.options.webRoot, this.options.entrypoint);
  }

  /**
   * Get Absolute Path from a relative path
   * @param relativePath Relative Path to Web Root
   */
  public getFilePath(relativePath: string): string {
    return resolve(this.options.webRoot, relativePath);
  }

  /**
   * Create a new SSRServer Instance
   * @param opt Properties of SSRServer
   */
  public constructor(opt: ClientOptions) {
    this.options = opt;
  }

  public async createFastifyServer(): Promise<FastifyInstance> {
    /**
     * Get All Route Modules.
     */
    const routes = await getRoutes(Container.of());

    /**
     * For each Route Module in routes destructure handler and options and register as a webServer Route.
     */
    routes.map((route) => {
      return this.webServer.route({
        ...route.options,
        handler: async (...params: unknown[]) => route.handler(...params),
      });
    });

    /**
     * Apollo GraphQL Server
     */
    const gqlServer = await createApolloServer();

    const apiPlugin = gqlServer.createHandler();

    /**
     * Register the Apollo Server Routes into the Fastify instance
     */
    await this.webServer.register(apiPlugin);

    return this.webServer;
  }

  public renderApp(path: string): string {
    const App = this.options.appComponent;

    logger.debug(`SSRServer.renderApp(${path})`);

    const appHTML = renderToString(<App />);

    const coreHTML = `<html>
    <head>
      <title>TS-ESWeb</title>
      <link rel="manifest" href="/WebManifest.json">
    </head>
    <body>
      <div id="app">${appHTML}</div>
      <script type="module">
      import { Workbox } from 'https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-window.prod.mjs';
  
      const wb = new Workbox('/Static/${this.getFilePath(
        'ServiceWorker.ts',
      )}', {
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
          import('/Static/${this.getFilePath('Client.tsx')}')
        }
      });
  
      wb.register();
  
      window.wb = wb;
  
  
      wb.active.then(() => import('/Static/${this.getFilePath('Client.tsx')}'));
      </script>
    </body>
    </html>`;

    return coreHTML;
  }
}
