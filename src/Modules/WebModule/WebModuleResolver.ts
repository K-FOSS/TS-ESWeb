// src/Modules/WebModules/WebModuleResolver.ts
import { Arg, Field, InputType, Query, Resolver } from 'type-graphql';
import { Inject, Service } from 'typedi';
import { logger } from '../../Library/Logger';
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

@Resolver()
@Service()
export class WebModuleResolver {
  @Inject(() => RedisController)
  public redisController: RedisController;

  @Inject(serverOptionsToken)
  public options: ServerOptions;

  @Query(() => WebModule)
  public async webModule(
    @Arg('filter', () => WebModuleFilter) input: WebModuleFilter,
  ): Promise<WebModule> {
    logger.silly(`WebModuleResolver.webModule(${input.specifier})`);

    const webModuleMapString = await this.redisController.getValue(
      RedisType.MODULE_MAP,
      input.specifier,
    );

    const webModuleMap = JSON.parse(webModuleMapString);

    logger.silly(`WebModuleResolver`, {
      webModuleMap,
    });

    const webModuleCode = await this.redisController.getValue(
      RedisType.MODULE,
      webModuleMap?.filePath,
    );

    logger.silly(`WebModuleResolver`, {
      webModuleMap,
      webModuleCode,
    });

    return {
      code: webModuleCode,
      filePath: '/test',
    };
  }
}
