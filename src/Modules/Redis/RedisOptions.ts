// src/Modules/Redis/RedisOptions.ts
import { IsDefined, IsString } from 'class-validator';
import { Token } from 'typedi';

export class RedisOptions {
  @IsString()
  @IsDefined()
  public host: string;
}

export const redisOptionsToken = new Token<RedisOptions>('redisOptions');
