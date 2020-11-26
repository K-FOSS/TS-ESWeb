// src/index.ts
import { resolve } from 'path';
import 'reflect-metadata';
import { App } from './Web_Test/App';
import { createSSRServer } from './Modules/Server';

console.log('Starting transpiler');

export const ssrServer = await createSSRServer({
  options: {
    appComponent: App,
    webRoot: resolve('./src/Web_Test'),
    entrypoint: 'Imports.ts',
    serverRoutes: [],
  },
});

await ssrServer.startTranspiler();

console.log('Creating Fastify Server');

const fastifyServer = await ssrServer.createFastifyServer();

await fastifyServer.listen(8080, '0.0.0.0');

console.log('Listening on port 8080');

export {};
