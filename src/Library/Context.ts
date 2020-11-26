// src/Library/Context.ts

interface Context {
  randomValue: 42;
}

/**
 * Get the GraphQL Context
 */
export async function getGQLContext(): Promise<Context> {
  /**
   * The answer to life and everything in the universe
   */
  const answerToEverything = 42;

  return {
    randomValue: answerToEverything,
  };
}
