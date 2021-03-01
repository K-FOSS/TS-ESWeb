// src/Modules/WebModule/WebModuleJobInput.ts
import { plainToClass } from 'class-transformer';
import { IsString, validateOrReject } from 'class-validator';

export class WebModuleJobInput {
  @IsString()
  public filePath: string;

  @IsString()
  public sourceText: string;

  /**
   * Create a new Class from params and validate.
   * @param inputParams Input Options for Web Module Job
   * @returns Promise resolving to validated class
   */
  public static async createWebModuleJobInput(
    inputParams: Partial<WebModuleJobInput>,
  ): Promise<WebModuleJobInput> {
    const jobInput = plainToClass(WebModuleJobInput, inputParams);
    await validateOrReject(jobInput);

    return jobInput;
  }
}
