/* eslint-disable @typescript-eslint/no-floating-promises */
// src/Server/Modules/WebModule/ModuleRoute.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'typedi';
import { Route } from '../../Library/Fastify';
import { webModuleController } from './WebModuleController';

@Service()
export default class WebModuleRoute implements Route {
  public options: Route['options'] = {
    method: 'GET',
    url: '/Static/*',
  };

  // eslint-disable-next-line @typescript-eslint/require-await
  public async handler(
    this: FastifyInstance,
    request: FastifyRequest<{ Params: { '*': string } }>,
    reply: FastifyReply,
  ): Promise<string> {
    const filePath = request.params['*'];
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

    reply.type('text/javascript');
    reply.header('Service-Worker-Allowed', '/');

    return webModule.code;
  }
}
