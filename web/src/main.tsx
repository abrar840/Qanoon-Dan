/**
 * Entry point. Loads the CSS once and wraps the app in its providers:
 *   Toast       -> small status messages (used everywhere)
 *   Auth        -> who is logged in
 *   Settings    -> theme etc. (needs Auth to sync with the server)
 *   Conversations -> sidebar list (needs Auth)
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './state/AuthContext';
import { ConversationsProvider } from './state/ConversationsContext';
import { SettingsProvider } from './state/SettingsContext';
import { ToastProvider } from './state/ToastContext';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/chat.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <ConversationsProvider>
              <App />
            </ConversationsProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
