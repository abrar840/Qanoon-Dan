/**
 * Route table: which URL shows which page.
 * AppShell is the frame (top bar + sidebar) around every page.
 */
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AboutPage } from './pages/AboutPage';
import { ChatPage } from './pages/ChatPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
