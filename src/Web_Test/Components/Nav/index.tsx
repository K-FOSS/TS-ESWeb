// src/Web_Test/Components/Nav/index.tsx
import { ReactElement } from 'react';
import { Link } from 'react-router-dom';

export function Nav(): ReactElement {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="About">About</Link>
      <Link to="Lab">Lab</Link>
    </nav>
  );
}
