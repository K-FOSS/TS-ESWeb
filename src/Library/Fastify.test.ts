// src/Library/Fastify.ts
import { TestSuite } from '@k-foss/ts-estests';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { getRoutes } from './Fastify';
import { logger } from './Logger';
import '../Utils/Setup';
import { deepStrictEqual } from 'assert';
import fastify from 'fastify';
import Container from 'typedi';

export class FastifyTestSuite extends TestSuite {
  public testName = 'Fastify Test Suite';

  public async test(): Promise<void> {
    logger.debug(`FastifyTestSuite.test()`);

    const [fastifyRoutes] = await Promise.all([
      getRoutes(
        Container.of(),
        resolve(fileURLToPath(import.meta.url), '../fixtures/Fastify/Routes1'),
      ),
    ]);

    deepStrictEqual(
      fastifyRoutes[0].options.url,
      '/Route1',
      'fastifyRoutes[0].options.url === /Route1',
    );

    deepStrictEqual(
      fastifyRoutes[0].options.method,
      'GET',
      'fastifyRoutes[0].options.method === GET',
    );

    const webServer = fastify();

    fastifyRoutes.map((route) => {
      return webServer.route({
        ...route.options,
        handler: async (...params) => route.handler(...params),
      });
    });

    logger.debug(`Routes have been injected`);

    const route1Request = await webServer.inject({
      method: 'GET',
      url: '/Route1',
    });

    deepStrictEqual(
      route1Request.statusCode,
      200,
      `GET Request to /Route1 returns code 200`,
    );

    deepStrictEqual(
      route1Request.headers['content-type'],
      'text/html',
      `GET Request to /Route1 returns ContentType text/html`,
    );
  }
}
