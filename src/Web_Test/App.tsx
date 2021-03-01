// src/App.tsx
import { Nav } from './Components/Nav';
import { Router } from './Components/Routers';

export function App(): React.ReactElement {
  return (
    <>
      <Nav />
      <Router />
    </>
  );
}
