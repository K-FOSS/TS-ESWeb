declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: import('../Utils/Environment').Environment;
    LOG_LEVEL: keyof typeof import('../Library/Logger').LogLevel;
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
