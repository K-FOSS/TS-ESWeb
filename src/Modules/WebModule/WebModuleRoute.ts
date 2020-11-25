// src/Server/Modules/WebModule/ModuleRoute.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Route } from '../../Library/Fastify';
import { webModuleController } from './WebModuleController';

export default class WebModuleRoute implements Route {
  public options: Route['options'] = {
    method: 'GET',
    url: '/Static/*',
  };

  public async handler(
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const filePath = request.params['*'] as string;
    if (!filePath) {
      const err = (new Error() as unknown) as {
        statusCode: number;
        message: string;
      };
      err.statusCode = 400;
      err.message = 'Invalid file path';
      throw err;
    }

    const moduleFilePath = filePath.startsWith('/') ? filePath : `/${filePath}`;

    const webModule = webModuleController.getModule(moduleFilePath);

    if (!webModule) {
      const err = (new Error() as unknown) as {
        statusCode: number;
        message: string;
      };
      err.statusCode = 404;
      err.message = 'Invalid file';
      throw err;
    }

    await reply.type('text/javascript');
    await reply.header('Service-Worker-Allowed', '/');
    await reply.send(webModule.code);
  }
}
