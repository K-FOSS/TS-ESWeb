// src/Modules/Server/SSRServer.ts
import { resolve } from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ReactFunction } from '../../Utils/React';
import { startWebTranspiler } from '../TypeScript';

interface ClientOptions {
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

/**
 * TS-ESWeb SSR Server Controller
 */
export class SSRServer {
  /**
   * Client Provided Options
   */
  public options: ClientOptions = {
    appComponent: () => <div>HelloWorld</div>,
    entrypoint: 'Imports.ts',
    webRoot: 'Web',
  };

  public get entrypoint(): string {
    return resolve(this.options.webRoot, this.options.entrypoint);
  }

  /**
   * Create a new SSRServer Instance
   * @param opt Properties of SSRServer
   */
  public constructor(opt: ClientOptions) {
    this.options = opt;
  }

  /**
   * Start transpiling Modules from Imports
   */
  public async startTranspiler(): Promise<void> {
    console.log(`Starting transpiler for ${this.entrypoint}`);

    await startWebTranspiler(this.entrypoint);
  }

  public renderApp(path: string): string {
    const App = this.options.appComponent;

    console.log(`Rendering for ${path}`);

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
  
      const wb = new Workbox('/Static/ServiceWorker.ts', {
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
          import('/Static//workspace/src/Web/Entry.ts')
        }
      });
  
      wb.register();
  
      window.wb = wb;
  
  
      wb.active.then(() => import('/Static//workspace/src/Web/Entry.ts'));
      </script>
    </body>
    </html>`;

    return coreHTML;
  }
}
