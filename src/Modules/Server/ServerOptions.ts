// src/Modules/Server/ServerOptions.ts
import { Type } from 'class-transformer';
import { IsDefined, IsUUID, ValidateNested } from 'class-validator';
import { Token } from 'typedi';
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
}

export const serverOptionsToken = new Token<ServerOptions>('serverOptions');
