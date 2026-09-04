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
    setPendingCount(getQueueLength());
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <span className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col font-sans">
      <Header currentUser={user} onLogout={logout} pendingCount={pendingCount} onSync={handleSync} isSyncing={isSyncing} />
      <div className="flex-1 bg-zinc-100">
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
