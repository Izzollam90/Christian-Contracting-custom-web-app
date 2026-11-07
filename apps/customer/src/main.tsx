import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, MfaProvider } from '@herkey/shared';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <MfaProvider>
        <App />
      </MfaProvider>
    </AuthProvider>
  </React.StrictMode>
);
