export const NOTIFICATION_MODE: Record<string, 'landlord' | 'tenant'> = {
  penalty_raised: 'landlord',
  lease_expiry: 'landlord',
  maintenance_raised: 'landlord',
  maintenance_updated: 'landlord',
  lease_renewal_response: 'landlord',
  payment_due: 'tenant',
  payment_overdue: 'tenant',
  payment_claimed: 'tenant',
  lease_renewal_offer: 'tenant',
  renewal_signing_reminder: 'tenant',
  penalty_appeal: 'tenant',
  penalty_resolved: 'tenant',
};
