/* eslint-disable @typescript-eslint/ban-types */
// src/Library/Resolvers.ts
import { buildSchema, NonEmptyArray } from 'type-graphql';
import { findModuleFiles } from '../Utils/moduleFileFinder';
import { GraphQLSchema } from 'graphql';
import { ContainerInstance } from 'typedi';

type ResolverModule = { [key: string]: Function };

export async function getResolvers(): Promise<Function[]> {
  const resolverModules = await findModuleFiles<ResolverModule>(
    /.*Resolver\.ts/,
  );

  return resolverModules.flatMap((resolverModule) =>
    Object.values(resolverModule),
  );
}

export async function buildGQLSchema(
  resolvers: Function[],
  container: ContainerInstance,
): Promise<GraphQLSchema> {
  return buildSchema({
    resolvers: resolvers as NonEmptyArray<Function>,
    container,
  });
}
