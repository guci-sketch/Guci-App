const fs = require('fs');
let code = fs.readFileSync('src/components/executor/ExecutorHome.tsx', 'utf8');

const navItemCode = `const NavItem = ({ tab, label, icon: Icon }: { tab: 'home' | 'jobs' | 'history' | 'profile', label: string, icon: any }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
        className={\`flex flex-col items-center justify-center w-full h-full space-y-1 \${
          active ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
        }\`}
      >
        <Icon size={20} className={active ? 'text-emerald-600' : 'text-slate-500'} strokeWidth={active ? 2.5 : 2} />
        <span className={\`text-[10px] font-medium \${active ? 'font-bold' : ''}\`}>{label}</span>
      </button>
    );
  };
`;

code = code.replace(/const SidebarItem: React\.FC<[^>]+> = \(\{ tab, label \}\) => \{[\s\S]*?<\/button>\s*\);\s*\};/, navItemCode);
fs.writeFileSync('src/components/executor/ExecutorHome.tsx', code);
