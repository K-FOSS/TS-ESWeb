// src/Modules/WebModule/WebModule.ts
import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class WebModule {
  @Field()
  public filePath: string;

  public constructor(opts: Partial<WebModule> = {}) {
    Object.assign(this, opts);
  }
}
