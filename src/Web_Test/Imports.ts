// src/Imports.ts
export async function importClient(): Promise<typeof import('./Client')> {
  return import('./Client');
}

export async function importApp(): Promise<typeof import('./App')> {
  return import('./App');
}
