// src/Library/Resolvers.ts
import { buildSchema, NonEmptyArray } from 'type-graphql';
import { findModuleFiles } from '../Utils/moduleFileFinder';
import { GraphQLSchema } from 'graphql';

export async function getResolvers(): Promise<Function[]> {
  const resolverModules = await findModuleFiles(/.*Resolver\.ts/);

  return resolverModules.flatMap((resolverModule) =>
    Object.values(resolverModule as any),
  );
}

export async function buildGQLSchema(
  resolvers: Function[],
): Promise<GraphQLSchema> {
  return buildSchema({
    resolvers: resolvers as NonEmptyArray<Function>,
  });
}
