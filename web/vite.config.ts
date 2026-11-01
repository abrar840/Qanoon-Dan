import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config. `react()` enables JSX and fast refresh. Nothing else is needed.
// Environment variables that start with VITE_ are exposed to the browser
// (see .env.example). Never put secret keys in VITE_ variables.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Set to true if you want to open the dev server from your phone on the
    // same Wi-Fi (Vite then prints a Network URL).
    host: false,
  },
});
