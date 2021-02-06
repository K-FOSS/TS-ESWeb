// src/Web_Test/Components/Counter/index.ts
import React from 'react';

export function Counter(): React.ReactElement {
  const [count, setCount] = React.useState(0);

  const increaseCount = React.useCallback(
    () => setCount((currentCount) => currentCount + 1),
    [setCount],
  );
  const decreaseCount = React.useCallback(
    () => setCount((currentCount) => currentCount - 1),
    [setCount],
  );

  return (
    <div>
      <h1>Count: {count}</h1>
      <div>
        <button onClick={increaseCount}>Increase</button>
        <button onClick={decreaseCount}>Decrease</button>
      </div>
    </div>
  );
}
