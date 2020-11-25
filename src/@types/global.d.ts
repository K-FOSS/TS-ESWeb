declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: import('../Utils/Environment').Environment;
  }
}

interface ImportMeta {
  url: string;

  resolve(specifier: string, parentUrl?: string): Promise<string>;
}

interface Window {
  wb: import('workbox-window').Workbox;

  serviceWorkerReady: boolean;
}
