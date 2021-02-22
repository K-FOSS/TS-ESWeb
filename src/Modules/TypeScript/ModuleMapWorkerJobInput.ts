// src/Modules/TypeScript/ModuleMapWorkerJobInput.ts
import { plainToClass } from 'class-transformer';
import { IsOptional, IsString, validateOrReject } from 'class-validator';
import { logger } from '../../Library/Logger';

export class ModuleMapWorkerJobInput {
  @IsString()
  public filePath: string;

  @IsString()
  @IsOptional()
  public specifier?: string;

  public static async createModuleMapJobInput(
    inputParams: Partial<ModuleMapWorkerJobInput>,
  ): Promise<ModuleMapWorkerJobInput> {
    logger.silly(`ModuleMapWorkerJobInput.createModuleMapJobInput()`, {
      inputParams,
    });

    const jobInput = plainToClass(ModuleMapWorkerJobInput, inputParams);
    await validateOrReject(jobInput);

    return jobInput;
  }
}
