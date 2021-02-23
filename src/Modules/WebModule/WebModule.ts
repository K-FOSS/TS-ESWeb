// src/Modules/WebModule/WebModule.ts
import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class WebModule {
  @Field()
  public filePath: string;

  @Field()
  public code: string;
}
