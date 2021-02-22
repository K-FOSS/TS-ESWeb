// src/Modules/TypeScript/TranspilerWorkerJobInput.ts
import { plainToClass } from 'class-transformer';
import { IsString, validateOrReject } from 'class-validator';

export class TranspilerWorkerJobInput {
  @IsString()
  public filePath: string;

  public static async createTranspilerWorkerJobInput(
    inputParams: Partial<TranspilerWorkerJobInput>,
  ): Promise<TranspilerWorkerJobInput> {
    const jobInput = plainToClass(TranspilerWorkerJobInput, inputParams);
    await validateOrReject(jobInput);

    return jobInput;
  }
}
