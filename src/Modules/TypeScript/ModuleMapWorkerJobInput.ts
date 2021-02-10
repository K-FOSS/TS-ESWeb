// src/Modules/TypeScript/ModuleMapWorkerJobInput.ts
import { IsOptional, IsString } from 'class-validator';

export class ModuleMapWorkerJobInput {
  @IsString()
  public filePath: string;

  @IsString()
  @IsOptional()
  public specifier?: string;
}
