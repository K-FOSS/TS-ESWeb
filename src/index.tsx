// src/index.ts
import { resolve } from 'path';
import 'reflect-metadata';
import { App } from './Web_Test/App';
import { createSSRServer } from './Modules/Server';

const ssrServer = await createSSRServer({
  appComponent: App,
  webRoot: resolve('./src/Web_Test'),
  entrypoint: 'Imports.ts',
});

console.log('Starting transpiler');

await ssrServer.startTranspiler();

console.log(ssrServer.renderApp('/'));

export {};
