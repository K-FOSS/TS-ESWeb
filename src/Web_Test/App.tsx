// src/App.tsx
import * as React from 'react';
import { Counter } from './Components/Counter/index';

export function App(): React.ReactElement {
  const sayHello = React.useCallback(() => console.log('HelloWorld'), []);

  return (
    <React.Fragment>
      <h1 onClick={sayHello}>HelloWorld</h1>
      <Counter />
    </React.Fragment>
  );
}
