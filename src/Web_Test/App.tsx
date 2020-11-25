// src/App.tsx
import React, { Suspense } from 'react';

const HomeRoute = React.lazy(() => import('./Routes/Home'));

export function App(): React.ReactElement {
  return (
    <Suspense fallback={<div>Loading</div>}>
      <h1>HelloWorld</h1>
      <HomeRoute />
    </Suspense>
  );
}
