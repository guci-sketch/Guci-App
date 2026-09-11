const fs = require('fs');

// File 1: src/components/auth/LoginForm.tsx
let loginFormCode = fs.readFileSync('src/components/auth/LoginForm.tsx', 'utf8');
loginFormCode = loginFormCode.replace(
  "Documentation &amp; Digital Reporting System &bull; Waktu Acuan Server: WIB",
  "Documentation &amp; Digital Reporting System"
);
fs.writeFileSync('src/components/auth/LoginForm.tsx', loginFormCode);

// File 2: src/components/common/Header.tsx
try {
  let headerCode = fs.readFileSync('src/components/common/Header.tsx', 'utf8');
  headerCode = headerCode.replace(
    /Waktu Acuan Server:[\s\S]*?WIB/,
    ""
  );
  fs.writeFileSync('src/components/common/Header.tsx', headerCode);
} catch (e) {
  // Ignore if not present in Header
}

console.log("Time reference removed from footers/headers.");
