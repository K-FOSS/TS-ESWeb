/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-floating-promises */
// src/index.ts
import fastify from 'fastify';
import { resolve } from 'path';
import './Utils/Setup';
import { logger } from './Library/Logger';
import { ServerController } from './Modules/Server/ServerController';
import { App } from './Web_Test/App';
import { WebAppManifest } from './Modules/WebAppManifest/WebAppManifest';

const webServer = fastify();

logger.info(`Starting TS-ESWeb`);

logger.debug(`Creating TS-ESWeb Web Manifest`);

export const server = await ServerController.createServer({
  redis: {
    host: 'Redis',
  },
  ssr: {
    webRoot: resolve('./src/Web_Test'),
    entrypoint: 'Imports.ts',
    appComponent: App,
  },
  manifest: {
    name: 'HelloWorld',
    backgroundColor: '#FFFFFF',
    description: 'Hello World App1',
    display: 'standalone',
    shortName: 'Hello',
    startURL: '/Test',
    icons: [
      {
        src:
          'https://www.shareicon.net/data/512x512/2016/07/10/119930_google_512x512.png',
        type: 'image/png',
        sizes: '512x512',
      },
    ],
  },
});

logger.debug(`Starting the TS-ESWeb SSR Server Transpiler`);

await server.startTypeScript();

const apiServer = await server.createApolloServer();

await webServer.register(apiServer.createHandler());

// await ssrServer.startTranspiler();

// logger.debug(`Creating the Fastify Server`);

// const fastifyServer = await ssrServer.createFastifyServer();

// const serverString = await fastifyServer.listen(8082, '0.0.0.0');

// logger.debug(`Fastify server is listening ${serverString}`);

webServer.get<{
  Params: {
    '*': string;
  };
}>('/Static/*', async function (request, reply) {
  const filePath = request.params['*'];

  const contents = await server.getPathModule(filePath);

  if (contents) {
    reply.type('application/javascript');
    reply.header('Service-Worker-Allowed', '/');

    return contents;
  }

  reply.code(404);

  reply.send('Error');
});

webServer.get(
  '/Main.webmanifest',
  async function (request, reply): Promise<WebAppManifest> {
    reply.type('application/manifest+json');
    reply.status(200);

    return server.handleWebAppManifest();
  },
);

webServer.get('/*', async function (request, reply) {
  reply.type('text/html');

  return server.renderHTML(request.url);
});

const bindHost = await webServer.listen(9090, '0.0.0.0');

logger.info(`Web server listening on ${bindHost}`);

export {};
