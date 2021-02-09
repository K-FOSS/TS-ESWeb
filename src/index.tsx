// src/index.ts
import { resolve } from 'path';
import 'reflect-metadata';
import { logger } from './Library/Logger';
import { createSSRServer } from './Modules/Server';
import { App } from './Web_Test/App';

logger.info(`Starting TS-ESWeb`);

logger.debug(`Creating TS-ESWeb SSR Server`);

export const ssrServer = await createSSRServer({
  options: {
    appComponent: App,
    webRoot: resolve('./src/Web_Test'),
    entrypoint: 'Imports.ts',
    serverRoutes: [],
  },
});

logger.debug(`Starting the TS-ESWeb SSR Server Transpiler`);

await ssrServer.startTranspiler();

logger.debug(`Creating the Fastify Server`);

const fastifyServer = await ssrServer.createFastifyServer();

const serverString = await fastifyServer.listen(8082, '0.0.0.0');

logger.debug(`Fastify server is listening ${serverString}`);

export {};
