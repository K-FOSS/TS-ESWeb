// src/Imports.ts
export async function importClient(): Promise<typeof import('./Client')> {
  return import('./Client');
}

export async function importApp(): Promise<typeof import('./App')> {
  return import('./App');
}

export async function importServiceWorker(): Promise<
  typeof import('./ServiceWorker')
> {
  return import('./ServiceWorker');
}

export async function importReactDOMServer(): Promise<
  typeof import('react-dom/server')
> {
  return import('react-dom/server');
}

export async function importReactDOM(): Promise<typeof import('react-dom')> {
  return import('react-dom');
}

export async function importReactJSXDev(): Promise<
  typeof import('react/jsx-dev-runtime')
> {
  return import('react/jsx-dev-runtime');
}

export async function importReactJSX(): Promise<
  typeof import('react/jsx-runtime')
> {
  return import('react/jsx-runtime');
}
