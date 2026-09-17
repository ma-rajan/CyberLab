import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ChallengesPage } from '../features/challenges/ChallengesPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { HomePage } from '../features/home/HomePage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { LabDetailPage } from '../features/labs/LabDetailPage';
import { LabsPage } from '../features/labs/LabsPage';

export function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route
            path="/labs"
            element={<ProtectedRoute><LabsPage /></ProtectedRoute>}
          />
          <Route
            path="/labs/:slug"
            element={<ProtectedRoute><LabDetailPage /></ProtectedRoute>}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AppLayout>
    </AuthProvider>
  );
}
