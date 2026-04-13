export interface NotificationPayload {
  /** Path-key identifying the destination, e.g. 'payments.detail' or 'contract.view' */
  target_route: string;
  /** Optional entity ID used by routes that need a dynamic segment */
  target_id?: string;
  /** Arbitrary key/value context forwarded to the destination (e.g. for pre-filtering) */
  context?: Record<string, string | number | boolean>;
  /** Fallback route key used when the primary route is feature-gated off */
  fallback_route?: string;
}
