// src/
import { getGQLContext } from './Context';

type ApolloServer = import('apollo-server-fastify').ApolloServer;
type ApolloServerTestClient = import('apollo-server-testing').ApolloServerTestClient;

let gqlServer: ApolloServer;

/**
 * Create Apollo GraphQL Server
 *
 * @returns Promise that resolves to a ApolloServer Instance
 */
export async function createApolloServer(): Promise<ApolloServer> {
  if (!gqlServer) {
    const [
      { ApolloServer },
      { getResolvers, buildGQLSchema },
    ] = await Promise.all([
      import('apollo-server-fastify'),
      import('./Resolvers'),
    ]);

    const resolvers = await getResolvers();

    gqlServer = new ApolloServer({
      schema: await buildGQLSchema(resolvers),
      context: getGQLContext,
      introspection: true,
      playground: {
        settings: {
          'editor.theme': 'light',
          'general.betaUpdates': true,
        },
        workspaceName: 'TS-ESWeb',
      },
    });
  }

  return gqlServer;
}

/**
 * Create a Apollo Server Testing instance
 */
export async function createApolloTestClient(): Promise<ApolloServerTestClient> {
  const { createTestClient } = await import('apollo-server-testing');

  const gqlServer = await createApolloServer();

  return createTestClient(gqlServer);
}
