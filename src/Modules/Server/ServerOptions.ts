// src/Modules/Server/ServerOptions.ts
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import Container, { Token } from 'typedi';
import { Environment, envMode } from '../../Utils/Environment';
import { RedisOptions } from '../Redis/RedisOptions';
import { SSROptions } from '../SSR/SSROptions';
import {
  WebAppManifest,
  webAppManifestToken,
} from '../WebAppManifest/WebAppManifest';

export class ServerOptions {
  @IsDefined()
  @ValidateNested()
  @Type(() => RedisOptions)
  public redis: RedisOptions;

  @IsDefined()
  @ValidateNested({
    always: true,
  })
  @Type(() => SSROptions)
  public ssr: SSROptions;

  @IsDefined()
  @ValidateNested({
    always: true,
  })
  @Type(() => WebAppManifest)
  @Transform(({ value, obj }) => {
    const container = Container.of((obj as ServerOptions).serverId);

    container.set(webAppManifestToken, value);

    return container.get(webAppManifestToken);
  })
  public readonly manifest: WebAppManifest;

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
