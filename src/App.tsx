/**
 * FIELDWORK — Field Work Documentation, Attendance & Anomaly Monitoring System
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ExecutorHome } from './components/executor/ExecutorHome';
import { LoginForm } from './components/auth/LoginForm';
import { getQueueLength, syncQueue } from './utils/offlineQueue';

const Shell: React.FC = () => {
  const { user, status, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    getQueueLength().then(setPendingCount);
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    await syncQueue(remaining => setPendingCount(remaining));
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleSync);
    return () => window.removeEventListener('online', handleSync);
  }, [handleSync]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <span className="w-8 h-8 border-2 border-[var(--border-subtle)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col font-sans">
      <div className="flex-1 flex flex-col">
        {user.role === 'ADMIN' ? <AdminDashboard /> : <ExecutorHome />}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
