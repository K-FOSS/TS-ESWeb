// src/Modules/Server/createSSRServer.ts
import { SSRServer } from './SSRServer';
import { timeout } from '../../Utils/timeout';

interface SSRServerOptions {
  test?: string;
}

export async function createSSRServer({
  test,
}: SSRServerOptions): Promise<SSRServer> {
  await timeout(100);

  console.log(
    `Creating SSR Server with specified configuration, ${test || 'test'}`,
  );

  return new SSRServer();
}
