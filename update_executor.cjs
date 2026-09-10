const fs = require('fs');
let code = fs.readFileSync('src/components/executor/ExecutorHome.tsx', 'utf8');

// Update Header usage to remove onMenuToggle
code = code.replace(
  /<Header currentUser=\{user\} onLogout=\{logout\} pendingCount=\{pendingCount\} onSync=\{attemptSync\} isSyncing=\{isSyncing\} onMenuToggle=\{[^}]+\} mobileMenuOpen=\{mobileMenuOpen\} \/>/,
  '<Header currentUser={user} onLogout={logout} pendingCount={pendingCount} onSync={attemptSync} isSyncing={isSyncing} hideMobileMenu={true} />'
);

const bottomNavMatch = /\{\/\* Bottom Navigation for Mobile App UI\/UX \*\/\}(?:\n|.)*?<\/nav>/;

const newBottomNav = `{/* Bottom Navigation for Mobile App UI/UX */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-slate-200 pb-safe z-40 h-[65px] flex items-center justify-between px-4 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          <div className="flex-1 flex justify-around">
            <NavItem tab="home" label="Beranda" icon={Home} />
            <NavItem tab="jobs" label="Proyek" icon={Briefcase} />
          </div>
          
          <div className="relative -top-5 flex flex-col items-center px-2">
            {ongoingJob ? (
              <button
                onClick={() => setTreatmentFormReport(ongoingJob)}
                className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 border-4 border-white active:scale-95 transition-transform"
              >
                <LogOut size={24} />
              </button>
            ) : readyJob ? (
              <button
                onClick={() => setActiveCameraAction({ type: 'CHECK_IN', report: readyJob })}
                className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 border-4 border-white active:scale-95 transition-transform"
              >
                <Camera size={24} />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('jobs')}
                className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-800/30 border-4 border-white active:scale-95 transition-transform"
              >
                <Plus size={24} />
              </button>
            )}
            <span className="text-[10px] font-bold text-slate-700 mt-1 whitespace-nowrap">
              {ongoingJob ? 'Check Out' : 'Check In'}
            </span>
          </div>

          <div className="flex-1 flex justify-around">
            <NavItem tab="history" label="Riwayat" icon={History} />
            <NavItem tab="profile" label="Profil" icon={UserIcon} />
          </div>
        </nav>`;

code = code.replace(bottomNavMatch, newBottomNav);

fs.writeFileSync('src/components/executor/ExecutorHome.tsx', code);
