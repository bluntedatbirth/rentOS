/**
 * Maps notification type → the recipient's role, used by the notification bell
 * to decide whether a mode-switch is needed before navigating.
 *
 * Rules:
 * - Include a type ONLY when it is ALWAYS sent to exactly one role.
 * - Omit types that can go to either role (e.g. lease_expiry, lease_ended,
 *   penalty_raised) — the bell falls back to the viewer's own role, which
 *   is correct since each person receives their own role-scoped copy.
 */
export const NOTIFICATION_MODE: Record<string, 'landlord' | 'tenant'> = {
  // Always sent to landlord
  payment_claimed: 'landlord', // tenant claimed payment → landlord must confirm
  maintenance_raised: 'landlord', // tenant raised a maintenance request
  lease_renewal_response: 'landlord', // tenant responded to renewal offer

  // Always sent to tenant
  payment_due: 'tenant',
  payment_overdue: 'tenant',
  maintenance_updated: 'tenant', // maintenance status changed → notify tenant
  lease_renewal_offer: 'tenant',
  renewal_signing_reminder: 'tenant',
  penalty_appeal: 'tenant',
  penalty_resolved: 'tenant',

  // lease_expiry  — sent to BOTH roles; omitted so bell uses viewer's own role
  // lease_ended   — sent to BOTH roles; omitted so bell uses viewer's own role
  // penalty_raised — sent to landlord from cron, to tenant from onPenaltyConfirmed; omitted
};
