const fs = require('fs');
let code = fs.readFileSync('src/api/auth.ts', 'utf8');

if (!code.includes('generateInvite')) {
  code += `
export async function generateInvite(role: 'ADMIN' | 'TEKNISI' = 'TEKNISI') {
  const res = await api.post<{ token: string; role: string; expiresAt: string }>('/auth/invite', { role });
  return res;
}

export async function validateInvite(token: string) {
  const res = await api.get<{ valid: boolean; role: string }>(\`/auth/invite/\${token}\`);
  return res;
}
`;
}

// Update signup signature
code = code.replace(
  "export async function signup(name: string, email: string, nip: string, password: string, role: string, honeypot?: string) {",
  "export async function signup(name: string, email: string, nip: string, password: string, role: string, honeypot?: string, token?: string) {"
);
code = code.replace(
  "{ name, email, nip, password, role, honeypot }",
  "{ name, email, nip, password, role, honeypot, token }"
);

fs.writeFileSync('src/api/auth.ts', code);
