/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/ban-types */
// src/Modules/SSR/SSRRoute.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'typedi';
import { Route } from '../../Library/Fastify';
import { ssrServer } from '../Server/createSSRServer';

/**
 * Route to serve the rendered React SSR Routes
 */
@Service()
export default class SSRRoute implements Route {
  public options: Route['options'] = {
    method: 'GET',
    url: '/Test',
  };

  // eslint-disable-next-line @typescript-eslint/require-await
  public async handler(
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<string> {
    reply.type('text/html');

    const appHTML = ssrServer.renderApp(request.url);

    return appHTML;
  }
}
