const fs = require('fs');
let code = fs.readFileSync('src/components/common/Header.tsx', 'utf8');

const replacement = `{/* Mobile Toggle */}
          {!hideMobileMenu && (
            <button
              className="md:hidden p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              onClick={() => {
                if (onMenuToggle) {
                  onMenuToggle();
                } else {
                  setMenuOpen(!menuOpen);
                }
              }}
            >
              {(mobileMenuOpen ?? menuOpen) ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}`;

code = code.replace(/\{\/\* Mobile Toggle \*\/\}(?:\n|.)*?\)\}/, replacement);
fs.writeFileSync('src/components/common/Header.tsx', code);
