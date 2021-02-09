// src/Library/Logger.ts
import * as winston from 'winston';

export const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.prettyPrint(),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.Console({
      debugStdout: true,
    }),
  ],
});
