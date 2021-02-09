/* eslint-disable @typescript-eslint/no-floating-promises */
// src/Library/fixtures/Fastify/Routes1/Route1/Fastify1Route.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'typedi';
import { Route } from '../../../../Fastify';
import { logger } from '../../../../Logger';

/**
 * Route to serve the rendered React SSR Routes
 */
@Service()
export default class FastifyRoute1 implements Route {
  public options: Route['options'] = {
    method: 'GET',
    url: '/Route1',
  };

  public async handler(
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<string> {
    reply.status(200);
    reply.type('text/html');

    logger.debug(`FastifyRoute1.handler()`);

    return `<html><head><title>HelloWorld</title></head><body></body></html>`;
  }
}
