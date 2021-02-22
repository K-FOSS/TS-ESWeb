// src/Modules/WebModules/WebModuleJobInput.ts
import { plainToClass } from 'class-transformer';
import { IsOptional, IsString, validateOrReject } from 'class-validator';

export class WebModuleJobInput {
  @IsString()
  public filePath: string;

  @IsString()
  @IsOptional()
  public specifier?: string;

  @IsString({
    each: true,
  })
  public importedModules?: string[];

  public static async createWebModuleJobInput(
    inputParams: Partial<WebModuleJobInput>,
  ): Promise<WebModuleJobInput> {
    const jobInput = plainToClass(WebModuleJobInput, inputParams);
    await validateOrReject(jobInput);

    return jobInput;
  }
}
