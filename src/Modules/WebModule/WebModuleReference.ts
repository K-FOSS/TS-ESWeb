// src/Modules/WebModules/WebModuleReference.ts

import { plainToClass } from 'class-transformer';
import { IsString, validateOrReject } from 'class-validator';

export class WebModuleReference {
  @IsString()
  public specifier: string;

  @IsString()
  public webModuleId: string;

  public static async createWebModuleReference(
    input: Partial<WebModuleReference>,
  ): Promise<WebModuleReference> {
    const webModuleReference = plainToClass(WebModuleReference, input);
    await validateOrReject(webModuleReference);

    return webModuleReference;
  }
}
