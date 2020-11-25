// src/Modules/App/App.tsx
import React, { PropsWithChildren } from 'react';

export function CoreApp({
  children,
}: PropsWithChildren<{}>): React.ReactElement {
  return (
    <>
      <p>Hello World</p>
      {children}
    </>
  );
}
