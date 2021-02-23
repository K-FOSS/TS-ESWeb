// src/Modules/WebModule/WebModuleMap.ts
import { plainToClass } from 'class-transformer';
import { IsString, validateOrReject } from 'class-validator';
import { ObjectType } from 'type-graphql';
import {} from 'typedi';

@ObjectType()
export class WebModuleMap {
  @IsString()
  public filePath: string;

  @IsString({
    each: true,
  })
  public imports: string[];

  /**
   * Create a Module Map Class object
   * @param inputArgs Input paramters for Web Module Map
   * @returns Promise resolving to validated Module Map
   */
  public static async createModuleMap(
    inputArgs: Partial<WebModuleMap>,
  ): Promise<WebModuleMap> {
    const webModuleMap = plainToClass(WebModuleMap, inputArgs);
    await validateOrReject(webModuleMap);

    return webModuleMap;
  }
}
