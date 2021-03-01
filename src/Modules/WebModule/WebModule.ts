// src/Modules/WebModule/WebModule.ts
import { plainToClass } from 'class-transformer';
import { IsString, validateOrReject } from 'class-validator';
import { Field, ObjectType } from 'type-graphql';
import { Service } from 'typedi';

@Service()
@ObjectType()
export class WebModule {
  @IsString()
  @Field()
  public filePath: string;

  @Field(() => String)
  public code: string;

  public static async createWebModule(
    input: Partial<WebModule>,
  ): Promise<WebModule> {
    const webModule = plainToClass(WebModule, input);
    await validateOrReject(webModule);

    return webModule;
  }
}
