// src/Library/Logger.ts
import * as winston from 'winston';
import LokiTransport from 'winston-loki';

export enum LogLevel {
  SILLY = 'silly',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

function isKeyOf<Obj extends { [key: string]: string }, K extends keyof Obj>(
  obj: Obj,
  key: K | string,
): key is K {
  return Object.keys(obj).includes(key as string);
}

function getLevel(value: string): LogLevel {
  if (isKeyOf(LogLevel, value)) {
    return LogLevel[value];
  }

  return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
}

export const logger = winston.createLogger({
  level: getLevel(process.env.LOG_LEVEL),
  defaultMeta: {
    appName: 'TS-ESWeb',
  },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.Console({
      level: 'silly',
      format: winston.format.prettyPrint({
        colorize: true,
      }),
    }),
    new LokiTransport({
      host: 'http://Loki:3100',
      format: winston.format.json({}),
      labels: { appName: 'TS-ESWeb' },
      json: false,
      replaceTimestamp: true,
    }),
  ],
});
