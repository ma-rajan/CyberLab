import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ChallengesPage } from '../features/challenges/ChallengesPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { HomePage } from '../features/home/HomePage';
import { LoginPage } from '../features/auth/LoginPage';

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </AppLayout>
  );
}
