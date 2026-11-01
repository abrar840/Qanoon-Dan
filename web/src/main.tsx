/**
 * Entry point. Loads the CSS once and wraps the app in its providers:
 *   Toast    -> small status messages (used everywhere)
 *   Settings -> theme and show-sources, saved in this browser
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
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
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
