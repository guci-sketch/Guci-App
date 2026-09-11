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
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

const Shell: React.FC = () => {
  const { user, status, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    getQueueLength().then(setPendingCount);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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
      <div className="flex-1 flex flex-col w-full h-full">
        {user.role === 'ADMIN' ? <AdminDashboard /> : <ExecutorHome />}
      </div>

      {/* Persistent Status Bar for Offline / Syncing */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm flex flex-col gap-2 pointer-events-none">
        {!isOnline && (
          <div className="bg-rose-600/95 backdrop-blur text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto border border-rose-500/50">
            <WifiOff size={16} />
            Mode Luring (Offline) Aktif
          </div>
        )}
        
        {isOnline && isSyncing && pendingCount > 0 && (
          <div className="bg-blue-600/95 backdrop-blur text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto border border-blue-500/50">
            <RefreshCw size={16} className="animate-spin" />
            Mensinkronkan {pendingCount} data...
          </div>
        )}

        {isOnline && !isSyncing && pendingCount > 0 && (
          <div 
            className="bg-amber-500/95 backdrop-blur text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-bottom-5 duration-300 cursor-pointer pointer-events-auto border border-amber-400/50 hover:bg-amber-600 transition-colors" 
            onClick={handleSync}
          >
            <AlertCircle size={16} />
            {pendingCount} Antrean Tersimpan. Klik Sync
          </div>
        )}
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
