export function getSiteUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.FRONTEND_URL ||
    'https://www.tesoy.online'
  ).replace(/\/$/, '');
}

