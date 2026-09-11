const fs = require('fs');
let code = fs.readFileSync('backend-src/modules/auth/authRoutes.ts', 'utf8');

// Update schema
code = code.replace(
  "  honeypot: z.string().optional()",
  "  honeypot: z.string().optional(),\n  token: z.string().optional()"
);

// Add invite generation endpoint
const inviteLogic = `
authRouter.post(
  '/invite',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'ADMIN') throw new HttpError(403, 'Akses ditolak.');
    
    // Generate a secure random token
    const token = require('crypto').randomBytes(32).toString('hex');
    const role = req.body.role === 'ADMIN' ? 'ADMIN' : 'EXECUTOR';
    
    // Set expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await query(
      \`insert into user_invitations (token, expires_at, role, created_by) values ($1, $2, $3, $4)\`,
      [token, expiresAt.toISOString(), role, req.user!.id]
    );
    
    await logAction(req.user as any, 'CREATE_INVITE', 'system', null, \`Membuat link undangan untuk \${role}\`);
    
    res.json({ token, role, expiresAt });
  })
);

authRouter.get(
  '/invite/:token',
  asyncHandler(async (req, res) => {
    const rows = await query(\`select * from user_invitations where token = $1\`, [req.params.token]);
    const invite = rows[0];
    if (!invite) throw new HttpError(404, 'Link undangan tidak valid atau tidak ditemukan.');
    if (new Date(invite.expires_at) < new Date()) throw new HttpError(400, 'Link undangan sudah kedaluwarsa.');
    
    res.json({ valid: true, role: invite.role });
  })
);
`;

code = code.replace(
  "authRouter.post(\n  '/signup',",
  inviteLogic + "\nauthRouter.post(\n  '/signup',"
);

const validationLogic = `
    const userCount = await query('select count(*) as count from users');
    if (parseInt(userCount[0].count) > 0) {
      if (!parsed.data.token) {
        throw new HttpError(403, 'Pendaftaran hanya dapat dilakukan melalui link undangan dari Administrator.');
      }
      
      const inviteRows = await query('select * from user_invitations where token = $1', [parsed.data.token]);
      const invite = inviteRows[0];
      
      if (!invite) {
        throw new HttpError(400, 'Link undangan tidak valid.');
      }
      if (new Date(invite.expires_at) < new Date()) {
        throw new HttpError(400, 'Link undangan sudah kedaluwarsa.');
      }
      
      // Enforce the role specified in the invite
      parsed.data.role = invite.role === 'ADMIN' ? 'ADMIN' : 'TEKNISI';
      
      // Delete the invite so it can't be used again
      await query('delete from user_invitations where token = $1', [parsed.data.token]);
    } else {
      // First user is always admin
      parsed.data.role = 'ADMIN';
    }
`;

code = code.replace(
  "const existing = await query('select id from users where email = $1', [parsed.data.email.toLowerCase()]);",
  validationLogic + "\n    const existing = await query('select id from users where email = $1', [parsed.data.email.toLowerCase()]);"
);

fs.writeFileSync('backend-src/modules/auth/authRoutes.ts', code);
