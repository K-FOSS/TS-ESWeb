// src/Server/Modules/Config/Env.ts

export enum Environment {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
}

let envMode: Environment;

switch (process.env.NODE_ENV) {
  case Environment.PRODUCTION:
    envMode = Environment.PRODUCTION;
    break;

  default:
    envMode = Environment.DEVELOPMENT;
    break;
}

export { envMode };
