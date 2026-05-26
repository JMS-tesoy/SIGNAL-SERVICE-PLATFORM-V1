interface BaseEmailTemplateProps {
  title: string;
  preheader?: string;
  body: string;
  cta?: {
    label: string;
    url: string;
  };
  fallbackLink?: string;
  code?: string;
  securityNotice: string;
}

const brand = 'Signal Service';
const accent = '#2563eb';
const textColor = '#111827';
const mutedColor = '#6b7280';

export function baseEmailTemplate({
  title,
  preheader,
  body,
  cta,
  fallbackLink,
  code,
  securityNotice,
}: BaseEmailTemplateProps): string {
  const fallbackUrl = fallbackLink || cta?.url;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f4f6; color:${textColor}; font-family:Arial, Helvetica, sans-serif;">
    ${preheader ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>` : ''}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
            <tr>
              <td style="padding:0 0 16px 0; font-size:20px; font-weight:700; color:${textColor};">
                ${brand}
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; padding:28px;">
                <h1 style="margin:0 0 12px 0; font-size:24px; line-height:1.3; color:${textColor};">${title}</h1>
                <p style="margin:0 0 22px 0; font-size:16px; line-height:1.6; color:#374151;">${body}</p>
                ${
                  code
                    ? `<div style="margin:22px 0; padding:18px; border-radius:12px; background:#f9fafb; border:1px solid #e5e7eb; text-align:center;">
                        <div style="font-size:32px; line-height:1.2; letter-spacing:8px; font-weight:700; color:${textColor};">${code}</div>
                      </div>`
                    : ''
                }
                ${
                  cta
                    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0;">
                        <tr>
                          <td style="border-radius:8px; background:${accent};">
                            <a href="${cta.url}" style="display:inline-block; padding:12px 18px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700;">${cta.label}</a>
                          </td>
                        </tr>
                      </table>`
                    : ''
                }
                ${
                  fallbackUrl
                    ? `<p style="margin:22px 0 0 0; font-size:13px; line-height:1.6; color:${mutedColor};">
                        If the button does not work, copy and paste this link into your browser:<br>
                        <a href="${fallbackUrl}" style="color:${accent}; word-break:break-all;">${fallbackUrl}</a>
                      </p>`
                    : ''
                }
                <div style="margin-top:24px; padding-top:18px; border-top:1px solid #e5e7eb;">
                  <p style="margin:0; font-size:13px; line-height:1.6; color:${mutedColor};">${securityNotice}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 4px 0 4px; font-size:12px; line-height:1.6; color:${mutedColor};">
                This is an automated message from ${brand}. Please do not share security codes or account links with anyone.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function baseEmailText({
  title,
  body,
  cta,
  fallbackLink,
  code,
  securityNotice,
}: BaseEmailTemplateProps): string {
  const lines = [
    brand,
    '',
    title,
    '',
    body,
  ];

  if (code) {
    lines.push('', `Code: ${code}`);
  }

  if (cta) {
    lines.push('', `${cta.label}: ${cta.url}`);
  }

  if (fallbackLink && fallbackLink !== cta?.url) {
    lines.push('', `Link: ${fallbackLink}`);
  }

  lines.push('', securityNotice, '', `This is an automated message from ${brand}.`);

  return lines.join('\n');
}

