import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@herkey/shared';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
