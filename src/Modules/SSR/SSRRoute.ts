/* eslint-disable @typescript-eslint/ban-types */
// src/Modules/SSR/SSRRoute.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { HMRLoader } from '../../Utils/hmrLoader';
import { Route } from '../../Library/Fastify';

/**
 * Route to serve the rendered React SSR Routes
 */
export default class SSRRoute implements Route {
  public options: Route['options'] = {
    method: 'GET',
    url: '/*',
  };

  public async handler(
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<Function> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { renderWeb } = await HMRLoader(
      '../../../Web/Server',
      import.meta.url,
    );

    await reply.type('text/html');

    return renderWeb(request.req.url!);
  }
}
