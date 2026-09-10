import { query } from '../db/pool.js';
import { AuthUser } from '../middleware/auth.js';

export async function logAction(
  actor: AuthUser,
  action: string,
  entityType: string,
  entityId: string | null,
  details: string,
  metadata?: Record<string, unknown>
) {
  await query(
    `insert into audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details, metadata)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [actor.id, actor.name, actor.role, action, entityType, entityId, details, metadata ? JSON.stringify(metadata) : null]
  );
}

/** For actions with no logged-in user behind them (scheduled jobs, cron). */
export async function logSystemAction(
  action: string,
  entityType: string,
  entityId: string | null,
  details: string,
  metadata?: Record<string, unknown>
) {
  await query(
    `insert into audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details, metadata)
     values (null, 'Scheduled Job', 'ADMIN', $1,$2,$3,$4,$5)`,
    [action, entityType, entityId, details, metadata ? JSON.stringify(metadata) : null]
  );
}
