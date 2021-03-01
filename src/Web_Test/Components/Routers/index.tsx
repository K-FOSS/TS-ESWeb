// src/Web_Test/Components/Routers/index.tsx
import { ReactElement } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomeRoute from '../../Routes/Home';
import AboutRoute from '../../Routes/About';
import LabRoute from '../../Routes/Lab';

export function Router(): ReactElement {
  return (
    <Routes>
      {' '}
      <Route path="/" element={<HomeRoute />} />
      <Route path="About" element={<AboutRoute />} />
      <Route path="Lab" element={<LabRoute />} />
    </Routes>
  );
}
