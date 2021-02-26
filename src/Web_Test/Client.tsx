// /* eslint-disable @typescript-eslint/no-non-null-assertion */
// // src/Client.tsx
// // Web/src/Client.tsx
// /// <reference types="react-dom/experimental" />
// // import React from 'react';
// import { render } from 'react-dom';
// // import { renderToString } from 'react-dom/cjs/react-dom-server.browser.development';

// /**
//  * Count needed so we can request an import with a new param each HMR
//  */
// // let count = 0;

// /**
//  * Render the Client Side
//  */
// async function renderClient(): Promise<void> {
//   const container = document.getElementById('app')!;

//   const { App } = await import('./App');

//   console.log(
//     render(
//       <>
//         <div>HelloWorld</div>
//       </>,
//       container,
//     ),
//   );
// }

// await renderClient();

// export {};

import * as ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';

async function renderApp(): Promise<void> {
  const container = document.getElementById('app');

  const { App } = await import('./App');

  ReactDOM.render(
    <div>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </div>,
    container,
  );
}

renderApp();
