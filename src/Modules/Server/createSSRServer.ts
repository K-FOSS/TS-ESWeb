// src/Modules/Server/createSSRServer.ts
import { logger } from '../../Library/Logger';
import { timeout } from '../../Utils/timeout';
import { ClientOptions, SSRServer } from './SSRServer';

interface SSRServerOptions {
  options: ClientOptions;
}

export let ssrServer: SSRServer;

export async function createSSRServer({
  options,
}: SSRServerOptions): Promise<SSRServer> {
  await timeout(50);

  logger.info(`Creating SSR Server with specified configuration`);

  ssrServer = new SSRServer(options);

  return ssrServer;
}
