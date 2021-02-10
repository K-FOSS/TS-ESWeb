// src/Modules/TypeScript/TranspilerWorkerJobInput.ts
import { IsString } from 'class-validator';

export class TranspilerWorkerJobInput {
  @IsString()
  public filePath: string;
}
