import "server-only";

/**
 * Resend requires a valid address on a domain you have verified in Resend.
 * Override in .env, e.g. RESEND_FROM_EMAIL="Erase Friction <noreply@yourdomain.com>"
 */
export function resendFrom(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return configured;
  return "Erase Friction <noreply@nadiron.com>";
}
