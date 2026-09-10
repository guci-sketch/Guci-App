const fs = require('fs');
let code = fs.readFileSync('src/components/common/Header.tsx', 'utf8');

code = code.replace(/interface HeaderProps \{/, 'interface HeaderProps {\n  hideMobileMenu?: boolean;');
code = code.replace(/export const Header: React\.FC<HeaderProps> = \(\{ currentUser, onLogout, pendingCount = 0, onSync, isSyncing, onMenuToggle, mobileMenuOpen \}\) => \{/, 'export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, pendingCount = 0, onSync, isSyncing, onMenuToggle, mobileMenuOpen, hideMobileMenu }) => {');

// Replace the button rendering
code = code.replace(/<button\s+className="md:hidden p-2 -ml-2 rounded-lg text-\[var\(--text-secondary\)\] hover:bg-\[var\(--bg-tertiary\)\]"[\s\S]*?onClick=\{[^}]*\}[\s\S]*?>/, `{!hideMobileMenu && (\n          <button\n            className="md:hidden p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"\n            onClick={() => {\n              if (onMenuToggle) {\n                onMenuToggle();\n              } else {\n                setMenuOpen(!menuOpen);\n              }\n            }}\n          >`);
code = code.replace(/<Menu size=\{24\} \/>\n\s*<\/button>/, `<Menu size={24} />\n          </button>\n          )}`);

fs.writeFileSync('src/components/common/Header.tsx', code);
