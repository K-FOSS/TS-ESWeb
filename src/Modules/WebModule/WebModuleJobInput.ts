// src/Modules/WebModule/WebModuleJobInput.ts
import { plainToClass } from 'class-transformer';
import { IsString, validateOrReject } from 'class-validator';

export class WebModuleJobInput {
  @IsString()
  public filePath: string;

  @IsString()
  public sourceText: string;

  public static async createWebModuleJobInput(
    inputParams: Partial<WebModuleJobInput>,
  ): Promise<WebModuleJobInput> {
    const jobInput = plainToClass(WebModuleJobInput, inputParams);
    await validateOrReject(jobInput);

    return jobInput;
  }
}
