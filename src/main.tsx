import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import DeviceApp from './DeviceApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeviceApp />
  </StrictMode>,
);
