import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SidepanelApp from '@/sidepanel/sidepanel-app';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <SidepanelApp />
  </StrictMode>,
);
