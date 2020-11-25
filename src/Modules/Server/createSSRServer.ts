// src/Modules/Server/createSSRServer.ts
import { ReactFunction } from '../../Utils/React';
import { timeout } from '../../Utils/timeout';
import { SSRServer } from './SSRServer';

interface SSRServerOptions {
  /**
   * App
   */
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
}

export async function createSSRServer({
  ...opts
}: SSRServerOptions): Promise<SSRServer> {
  await timeout(100);

  console.log(`Creating SSR Server with specified configuration`);

  return new SSRServer(opts);
}
