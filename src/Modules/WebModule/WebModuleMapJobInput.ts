// src/Modules/WebModules/WebModuleJobInput.ts
import { plainToClass } from 'class-transformer';
import { IsOptional, IsString, validateOrReject } from 'class-validator';

export class WebModuleMapJobInput {
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
    inputParams: Partial<WebModuleMapJobInput>,
  ): Promise<WebModuleMapJobInput> {
    const jobInput = plainToClass(WebModuleMapJobInput, inputParams);
    await validateOrReject(jobInput);

    return jobInput;
  }
}
