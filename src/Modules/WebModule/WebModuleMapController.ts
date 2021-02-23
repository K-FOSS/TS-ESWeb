// src/Modules/WebModule/WebModuleMapController.ts
import { Inject, Service } from 'typedi';
import { RedisController } from '../Redis/RedisController';
import { RedisType } from '../Redis/RedisTypes';
import { serverOptionsToken, ServerOptions } from '../Server/ServerOptions';
import { WebModuleMap } from './WebModuleMap';

@Service()
export class WebModuleMapController {
  public redisController: RedisController;

  public constructor(
    @Inject(serverOptionsToken)
    public options: ServerOptions,
  ) {
    this.redisController = new RedisController({
      ...options.redis,
    });
  }

  /**
   * Set a Module Map Object into Redis
   * @param input Web Module Map Input Params
   */
  public async setModuleMap(input: WebModuleMap): Promise<void> {
    const webModuleMap = await WebModuleMap.createModuleMap(input);
    const webModuleMapString = JSON.stringify(webModuleMap);

    return this.redisController.setValue(RedisType.MODULE_MAP, {
      key: input.filePath,
      value: webModuleMapString,
    });
  }

  /**
   * Get a Module Map Object from Redis
   * @param filePath File Path
   */
  public async getModuleMap(
    filePath: string,
  ): Promise<WebModuleMap | undefined> {
    const webModuleMapString = await this.redisController.getValue(
      RedisType.MODULE_MAP,
      filePath,
    );

    if (typeof webModuleMapString === 'string') {
      const webModuleMapParams = JSON.parse(webModuleMapString) as WebModuleMap;

      const webModuleMap = await WebModuleMap.createModuleMap(
        webModuleMapParams,
      );

      return webModuleMap;
    }
  }
}
