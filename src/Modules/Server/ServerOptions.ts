// src/Modules/Server/ServerOptions.ts
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Token } from 'typedi';
import { logger } from '../../Library/Logger';
import { Environment, envMode } from '../../Utils/Environment';
import { RedisOptions } from '../Redis/RedisOptions';
import { SSROptions } from '../SSR/SSROptions';

export class ServerOptions {
  @ValidateNested()
  @Type(() => RedisOptions)
  public redis: RedisOptions;

  @ValidateNested()
  @Type(() => SSROptions)
  public ssr: SSROptions;

  @IsUUID()
  @IsDefined()
  public serverId: string;

  @Expose()
  @IsEnum(Environment)
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'undefined') {
      return envMode;
    }

    return value as Environment;
  })
  public envMode: Environment;
}

export const serverOptionsToken = new Token<ServerOptions>('serverOptions');
