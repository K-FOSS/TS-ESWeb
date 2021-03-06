// src/Library/Fastify.ts
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RouteHandlerMethod,
  RouteOptions,
} from 'fastify';
import fastifyWS from 'fastify-websocket';
import { Container, ContainerInstance } from 'typedi';
import { findModuleFiles } from '../Utils/moduleFileFinder';
import { timeout } from '../Utils/timeout';

/**
 * Fastify Route
 */
export abstract class Route {
  /**
   * Fastify Route Options
   * https://www.fastify.io/docs/latest/Routes/#routes-option
   */
  public options: Omit<RouteOptions, 'handler' | 'preHandler'>;

  /**
   * Fastify Route Handler
   */
  abstract handler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): // eslint-disable-next-line @typescript-eslint/ban-types
  Promise<void> | Promise<string | {}>;
}

/**
 * Example route so that the findModuleFiles type isn't messed up
 */
export class ExampleRoute extends Route {
  public handler: Route['handler'] = async () => {
    await timeout(100);
    return 'example';
  };
}

interface RouteModule {
  default: typeof ExampleRoute;
}

export async function getRoutes(
  container: ContainerInstance,
  rootDir?: string,
): Promise<Route[]> {
  /**
   * Get all Modules under `Modules` that match `*Route.ts`
   */
  const routeModules = await findModuleFiles<RouteModule>(
    /.*Route\.(ts|js)x?/,
    rootDir,
  );

  // Destructure the default export from all matching route Modules, and construct the class
  return routeModules.flatMap(({ default: RouteClass }) =>
    container.get(RouteClass),
  );
}

/**
 * Create a Fastify Web Server
 */
export async function createFastifyServer(
  container: ContainerInstance = Container.of(),
): Promise<FastifyInstance> {
  const webServer = fastify({});

  // Register the fastify-websocket plugin
  // https://www.npmjs.com/package/fastify-websocket
  await webServer.register(fastifyWS);

  /**
   * Get All Route Modules.
   */
  const routes = await getRoutes(container);

  /**
   * For each Route Module in routes destructure handler and options and register as a webServer Route.
   */
  routes.map((route) => {
    return webServer.route({
      ...route.options,
      handler: async (...params: unknown[]) => route.handler(...params),
    });
  });

  return webServer;
}

/**
 * Creates a fastify Testing Chain https://www.fastify.io/docs/latest/Testing/
 */
export async function createFastifyTestServer(
  container?: ContainerInstance,
): Promise<FastifyInstance> {
  const webServer = await createFastifyServer(container);

  return webServer;
}
