const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importLines = `
import { getQueueLength, syncQueue } from './utils/offlineQueue';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
`;
code = code.replace(/import \{ getQueueLength, syncQueue \} from '.\/utils\/offlineQueue';/, importLines);

const statusState = `
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
`;
code = code.replace(/  const \[pendingCount, setPendingCount\] = useState\(0\);\n  const \[isSyncing, setIsSyncing\] = useState\(false\);/, statusState);

const statusEffect = `
  useEffect(() => {
    getQueueLength().then(setPendingCount);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
`;
code = code.replace(/  useEffect\(\(\) => \{\n    getQueueLength\(\)\.then\(setPendingCount\);\n  \}, \[\]\);/, statusEffect);

// Add the banner
const shellReturn = `
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col font-sans relative">
      {!isOnline && (
        <div className="bg-rose-600 text-white px-4 py-2 text-[11px] font-bold flex items-center justify-center gap-2 z-[999] shadow-md sticky top-0">
          <WifiOff size={14} />
          Anda sedang Offline. Mode luring aktif.
        </div>
      )}
      
      {isOnline && isSyncing && pendingCount > 0 && (
        <div className="bg-blue-600 text-white px-4 py-2 text-[11px] font-bold flex items-center justify-center gap-2 z-[999] shadow-md sticky top-0">
          <RefreshCw size={14} className="animate-spin" />
          Mensinkronkan {pendingCount} data antrean...
        </div>
      )}

      {isOnline && !isSyncing && pendingCount > 0 && (
        <div className="bg-amber-500 text-white px-4 py-2 text-[11px] font-bold flex items-center justify-center gap-2 z-[999] shadow-md sticky top-0 cursor-pointer" onClick={handleSync}>
          <AlertCircle size={14} />
          Ada {pendingCount} data tertunda. Klik untuk sinkronisasi.
        </div>
      )}

      <div className="flex-1 flex flex-col w-full h-full">
        {user.role === 'ADMIN' ? <AdminDashboard /> : <ExecutorHome />}
      </div>
    </div>
  );
`;
code = code.replace(/  return \(\n    <div className="min-h-screen bg-\[var\(--bg-primary\)\] flex flex-col font-sans">\n      <div className="flex-1 flex flex-col">\n        \{user.role === 'ADMIN' \? <AdminDashboard \/> : <ExecutorHome \/>\}\n      <\/div>\n    <\/div>\n  \);/, shellReturn.trim());

fs.writeFileSync('src/App.tsx', code);
