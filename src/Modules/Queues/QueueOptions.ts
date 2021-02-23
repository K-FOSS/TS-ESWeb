// src/Modules/Queues/QueueOptions.ts
import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import type { QueueOptions as BullMQOptions } from 'bullmq';
import { ServerOptions } from '../Server/ServerOptions';

export class QueueOptions<QueueName extends string, JobInput> {
  @IsString()
  @IsDefined()
  public name: QueueName;

  public serverOptions: ServerOptions;

  public bullOptions: BullMQOptions;

  public inputClass: JobInput;

  @IsBoolean()
  @IsOptional()
  public disableTermination?: boolean;
}
