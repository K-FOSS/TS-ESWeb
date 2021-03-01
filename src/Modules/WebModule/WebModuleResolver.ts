// src/Modules/WebModules/WebModuleResolver.ts
import {
  Arg,
  Field,
  FieldResolver,
  InputType,
  Query,
  Resolver,
  Root,
} from 'type-graphql';
import { Inject, Service } from 'typedi';
import { RedisController } from '../Redis/RedisController';
import { RedisType } from '../Redis/RedisTypes';
import { ServerOptions, serverOptionsToken } from '../Server/ServerOptions';
import { WebModule } from './WebModule';
import { WebModuleController } from './WebModuleController';

@InputType()
class WebModuleFilter {
  @Field()
  public specifier: string;
}

@Service()
@Resolver(() => WebModule)
export class WebModuleResolver {
  @Inject(() => RedisController)
  private redisController: RedisController;

  @Inject(() => WebModuleController)
  public webModuleController: WebModuleController;

  @Inject(serverOptionsToken)
  public options: ServerOptions;

  @Query(() => WebModule)
  public async webModule(
    @Arg('filter', () => WebModuleFilter) input: WebModuleFilter,
  ): Promise<WebModule> {
    const webModule = await this.webModuleController.getWebModule(
      input.specifier,
    );

    return webModule;
  }

  @FieldResolver(() => String)
  public async code(@Root() { filePath }: WebModule): Promise<string> {
    return this.redisController.getValueOrThrow(RedisType.MODULE, filePath);
  }
}
