const fs = require('fs');
let code = fs.readFileSync('src/components/executor/ExecutorHome.tsx', 'utf8');

// Replace everything from {/* Mobile Menu Overlay */} to {/* Main Content */}
const start = code.indexOf('{/* Mobile Menu Overlay */}');
const end = code.indexOf('{/* Main Content */}');

if (start !== -1 && end !== -1) {
  code = code.substring(0, start) + code.substring(end + '{/* Main Content */}'.length);
}

fs.writeFileSync('src/components/executor/ExecutorHome.tsx', code);
