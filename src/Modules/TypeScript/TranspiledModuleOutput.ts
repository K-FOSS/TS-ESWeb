// src/Modules/TypeScript/TranspiledModuleOutput.ts
import { IsString } from 'class-validator';

export class TranspiledModuleOutput {
  @IsString()
  public filePath: string;
}
