export const emailSenders = {
  app:
    process.env.RESEND_FROM_APP ||
    process.env.EMAIL_FROM ||
    'Signal Service App <noreply@tesoy.online>',
  auth:
    process.env.RESEND_FROM_AUTH ||
    'Signal Service Auth <auth@tesoy.online>',
  support:
    process.env.RESEND_FROM_SUPPORT ||
    'Signal Service Support <support@tesoy.online>',
} as const;

