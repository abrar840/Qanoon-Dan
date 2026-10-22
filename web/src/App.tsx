/**
 * Route table. Two layouts:
 *   AppShell  : top bar + sidebar, for the product screens
 *   AuthLayout: centred card, for login / sign up / password screens
 */
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthLayout } from './components/layout/AuthLayout';
import { RequireAuth } from './components/layout/RequireAuth';
import { AboutPage } from './pages/AboutPage';
import { ChatPage } from './pages/ChatPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignUpPage } from './pages/SignUpPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/c/:id" element={<ChatPage />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
