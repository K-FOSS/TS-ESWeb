// src/Modules/Queues/QueueOptions.ts
import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { QueueOptions as BullMQOptions } from 'bullmq';

export class QueueOptions<QueueName extends string, JobInput> {
  @IsString()
  @IsDefined()
  public name: QueueName;

  public bullOptions: BullMQOptions;

  public inputClass: JobInput;

  @IsBoolean()
  @IsOptional()
  public disableTermination?: boolean;
}
