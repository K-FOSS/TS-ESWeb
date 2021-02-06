// src/App.tsx
import React from 'react';
import { Counter } from './Components/Counter/index';

export function App(): React.ReactElement {
  const sayHello = React.useCallback(() => console.log('HelloWorld'), []);

  console.log('HelloWorld');

  return (
    <>
      <h1 onClick={sayHello}>HelloWorld</h1>
      <Counter />
    </>
  );
}
