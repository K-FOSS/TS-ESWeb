// src/Modules/TypeScript/ResolvedModuleMap.ts
import { IsDefined, IsString } from 'class-validator';

export class ResolvedModuleMap {
  @IsString()
  @IsDefined()
  public filePath: string;

  public importedModules: string[];
}
