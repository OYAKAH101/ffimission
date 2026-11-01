import { AuditLog } from '../models/index.js';

// Writes a security/activity record. A failure to log must never break the request.
export async function audit({ action, actorId, message, ip }) {
  try {
    await AuditLog.create({ action, actorId, message, ip });
  } catch (error) {
    console.error('Could not write audit log:', error.message);
  }
}
