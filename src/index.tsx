// src/index.ts
import { resolve } from 'path';
import 'reflect-metadata';
import { logger } from './Library/Logger';
import { createSSRServer } from './Modules/Server';
import { ServerController } from './Modules/Server/ServerController';
import { WebAppManifest } from './Modules/WebAppManifest/WebAppManifest';
import { WebAppManfiestController } from './Modules/WebAppManifest/WebAppManifestController';
import { App } from './Web_Test/App';

logger.info(`Starting TS-ESWeb`);

logger.debug(`Creating TS-ESWeb SSR Server`);

const manifest: WebAppManifest = {
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
};

await WebAppManfiestController.loadManifest(manifest);

export const server = await ServerController.createServer({
  redis: {
    hostname: 'Redis',
  },
  ssr: {
    webRoot: resolve('./src/Web_Test'),
    entrypoint: 'Imports.ts',
    appComponent: App,
  },
});

logger.debug(`Starting the TS-ESWeb SSR Server Transpiler`);

await server.startTypeScript();

// await ssrServer.startTranspiler();

logger.debug(`Creating the Fastify Server`);

// const fastifyServer = await ssrServer.createFastifyServer();

// const serverString = await fastifyServer.listen(8082, '0.0.0.0');

// logger.debug(`Fastify server is listening ${serverString}`);

export {};
