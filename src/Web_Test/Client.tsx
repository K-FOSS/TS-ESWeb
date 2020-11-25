/* eslint-disable @typescript-eslint/no-non-null-assertion */
// src/Client.tsx
// Web/src/Client.tsx
/// <reference types="react-dom/experimental" />
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';

/**
 * Count needed so we can request an import with a new param each HMR
 */
//let count = 0;

/**
 * Render the Client Side
 */
function renderClient(): void {
  const container = document.getElementById('app')!;

  const root = ReactDOM.unstable_createRoot(container, {
    hydrate: true,
  });

  root.render(<App />);
}

console.log('Starting render client');
renderClient();
