const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const shellReturn = `
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
`;
code = code.replace(/  return \([\s\S]*?<\/div>\n    <\/div>\n  \);/, shellReturn.trim());

fs.writeFileSync('src/App.tsx', code);
