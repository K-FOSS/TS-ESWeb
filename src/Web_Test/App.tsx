// src/App.tsx
import { useCallback } from 'react';
import { Counter } from './Components/Counter/index';

export function App(): React.ReactElement {
  const sayHello = useCallback(() => console.log('HelloWorld'), []);

  return (
    <>
      <h1 onClick={sayHello}>HelloWorld</h1>
      <Counter />
    </>
  );
}
