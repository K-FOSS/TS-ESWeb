// src/Modules/Queues/QueueOptions.ts
import { IsDefined, IsString } from 'class-validator';
import { QueueOptions as BullMQOptions } from 'bullmq';

export class QueueOptions<QueueName extends string, JobInput, JobOutput> {
  @IsString()
  @IsDefined()
  public name: QueueName;

  public bullOptions: BullMQOptions;

  public outputClass: JobOutput;

  public inputClass: JobInput;
}
