// src/Modules/SSR/SSRRoute.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ServerResponse } from 'http';
import { HMRLoader } from '../../Utils/hmrLoader';
import { Route } from '../../Library/Fastify';

export default class SSRRoute implements Route {
  public options: Route['options'] = {
    method: 'GET',
    url: '/*',
  };

  async handler(
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply<ServerResponse>,
  ) {
    const { renderWeb } = await HMRLoader<typeof import('../../../Web/Server')>(
      '../../../Web/Server',
      import.meta.url,
    );

    reply.type('text/html');

    return renderWeb(request.req.url!);
  }
}
