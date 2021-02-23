/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/Modules/ServiceWorker/ServiceWorker.ts
// src/Web/serviceWorker.ts
const _self = (self as unknown) as ServiceWorkerGlobalScope;
declare const clients: Clients;

importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js',
);
if (!workbox) throw new Error('Workbox not definied');

interface WebModuleQueryResponse {
  filePath: string;
  specifier: string;
  code: string;
}

type WebModuleQuery = { data: { webModule: WebModuleQueryResponse | null } };

workbox.routing.registerRoute(
  /\/Static\/import/,
  async ({ url, request, event, params }) => {
    const moduleSpecifier = url.searchParams.get('specifier');

    let response: Response;
    if (moduleSpecifier) {
      console.log(`specifier: ${moduleSpecifier}`);
      const apiHeaders = new Headers();
      apiHeaders.set('content-type', 'application/json');

      const request = new Request('/graphql', {
        body: `{"operationName":"webModule","variables":{"moduleSpecifier":"${moduleSpecifier}"},"query":"query webModule($moduleSpecifier: String!) { webModule(filter: {specifier: $moduleSpecifier}) {    filePath code  }}"}`,
        method: 'POST',
        headers: apiHeaders,
      });

      const fetchResponse = await fetch(request);
      const queryResult = (await fetchResponse.json()) as WebModuleQuery;

      if (queryResult.data.webModule) {
        response = new Response(queryResult.data.webModule.code);
      } else {
        throw new Error('What?');
      }
    } else {
      console.log('Getting file: ', url, request, event, params);
      response = new Response(`console.log('helloWorld')`);
    }

    response.headers.set('Content-Type', 'application/javascript');

    return response;
  },
);
const channel = new BroadcastChannel('sw-messages');

interface ServiceWorkerSkipWaitingMessage {
  type: 'SKIP_WAITING';
}

interface ServiceWorkerClientClaimMessage {
  type: 'CLIENTS_CLAIM';
}

type ServiceWorkerMessage = MessageEvent & {
  data: ServiceWorkerSkipWaitingMessage | ServiceWorkerClientClaimMessage;
};

interface ServiceWorkerDoneMessage {
  type: 'DONE';
  command: 'CLIENTS_CLAIM' | 'SKIP_WAITING';
}

self.addEventListener('message', async (event: ServiceWorkerMessage) => {
  switch (event.data.type) {
    case 'SKIP_WAITING':
      await _self.skipWaiting();

      // self.postMessage({
      //   type: 'DONE',
      //   command: 'SKIP_WAITING',
      // } as ServiceWorkerDoneMessage);
      break;
    case 'CLIENTS_CLAIM':
      workbox.core.clientsClaim();

      await clients.claim();
      channel.postMessage({ type: 'READY' });
      // self.postMessage({
      //   type: 'DONE',
      //   command: 'CLIENTS_CLAIM',
      // } as ServiceWorkerDoneMessage);
      break;
  }
});

_self.addEventListener('activate', () => {
  console.log('SHIJFKDSHLFKJD');
});
