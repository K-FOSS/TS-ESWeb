/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-floating-promises */
// src/Modules/WebAppManifest/WebAppManifestRoute.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { Inject, Service } from 'typedi';
import { Route } from '../../Library/Fastify';
import { WebAppManifest, webAppManifestToken } from './WebAppManifest';

@Service()
export default class WebAppManifestRoute extends Route {
  public options: Route['options'] = {
    method: 'GET',
    url: '/WebManifest.json',
  };

  @Inject(webAppManifestToken)
  public manifest: WebAppManifest;

  public async handler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<string> {
    reply.type('application/json');

    try {
      /**
       * TODO: Fetch JSON Manifest and if not already load Manifest and cache;
       */

      return JSON.stringify(this.manifest);
    } catch {
      reply.status(500);

      return `Error fetching manifest`;
    }
  }
}
