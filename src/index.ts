// src/index.ts
import { timeout } from './Utils/timeout';

/**
 * Logs a greeting for the name after a 1.5 second delay.
 * @param name User you are greeting
 */
async function sayHello(name = 'John'): Promise<void> {
  console.log('Waiting 1.5 seconds then saying Hi');

  await timeout(1500);

  console.log(`Hello ${name}!`);
}

console.log(`Starting TS-Core`);

await sayHello('K-FOSS');

export {};
