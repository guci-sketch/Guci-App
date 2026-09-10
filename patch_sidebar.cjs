const fs = require('fs');
let code = fs.readFileSync('src/components/executor/ExecutorHome.tsx', 'utf8');

// Replace NavItem & sidebar layout
const regexSidebarItem = /const SidebarItem = \(\{ tab, label \}: \{ tab: 'home' \| 'jobs' \| 'history' \| 'profile', label: string \}\) => \{[\s\S]*?className=\{`w-full flex items-center justify-between px-3 py-2\.5 rounded-lg text-sm font-semibold transition-colors \$\{[\s\S]*?\}\`\}[\s\S]*?>[\s\S]*?<span className="text-left">\{label\}<\/span>[\s\S]*?<\/button>[\s\S]*?\);[\s\S]*?\};/;

const replacementNavItem = `const NavItem = ({ tab, label, icon: Icon }: { tab: 'home' | 'jobs' | 'history' | 'profile', label: string, icon: any }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={\`flex flex-col items-center justify-center w-full h-full space-y-1 \${
          active ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
        }\`}
      >
        <Icon size={20} className={active ? 'text-emerald-600' : 'text-slate-500'} strokeWidth={active ? 2.5 : 2} />
        <span className={\`text-[10px] font-medium \${active ? 'font-bold' : ''}\`}>{label}</span>
      </button>
    );
  };`;

code = code.replace(regexSidebarItem, replacementNavItem);

const regexHeaderAndSidebar = /<Header currentUser=\{user\} onLogout=\{logout\} pendingCount=\{pendingCount\} onSync=\{attemptSync\} isSyncing=\{isSyncing\} onMenuToggle=\{[^}]*\} mobileMenuOpen=\{mobileMenuOpen\} \/>[\s\S]*?<div className="flex flex-1 overflow-hidden relative">[\s\S]*?{mobileMenuOpen && \([\s\S]*?<\/div>[\s\S]*?\)}[\s\S]*?{?\/\* Sidebar \*\/}?(?:\n|.)*?<\/aside>/;

const replacementHeaderAndSidebar = `<Header currentUser={user} onLogout={logout} pendingCount={pendingCount} onSync={attemptSync} isSyncing={isSyncing} />
      
      <div className="flex flex-1 overflow-hidden relative">`;

code = code.replace(regexHeaderAndSidebar, replacementHeaderAndSidebar);

const regexMainEnd = /<\/main>/;
const replacementMainEnd = `</main>
        
        {/* Bottom Navigation for Mobile App UI/UX */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-slate-200 pb-safe z-40 h-[65px] flex items-center justify-around px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          <NavItem tab="home" label="Beranda" icon={Home} />
          <NavItem tab="jobs" label="Proyek" icon={Briefcase} />
          <NavItem tab="history" label="Riwayat" icon={History} />
          <NavItem tab="profile" label="Profil" icon={UserIcon} />
        </nav>`;

code = code.replace(regexMainEnd, replacementMainEnd);

fs.writeFileSync('src/components/executor/ExecutorHome.tsx', code);
