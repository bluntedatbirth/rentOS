/**
 * Shared email layout helpers.
 * Inline CSS only — no <style> tags, no external resources.
 * Design: warm-white background, charcoal text, saffron accents.
 */

const SAFFRON = '#E8A33D';
const CHARCOAL = '#2D2D2D';
const WARM_WHITE = '#FAFAF7';
const CONTAINER_BG = '#FFFFFF';
const MUTED = '#6B6B6B';

/**
 * Wraps bodyHtml in a full <!DOCTYPE html> document with branded layout.
 */
export function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${WARM_WHITE};font-family:'DM Sans',Arial,sans-serif;color:${CHARCOAL};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${WARM_WHITE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:${CONTAINER_BG};border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 40px 20px;border-bottom:1px solid #EEEDE8;">
              <span style="font-size:22px;font-weight:700;color:${CHARCOAL};letter-spacing:-0.5px;">RentOS</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #EEEDE8;text-align:center;">
              <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.6;">
                <a href="mailto:hello@rentos.homes" style="color:${SAFFRON};text-decoration:none;">hello@rentos.homes</a>
                &nbsp;&bull;&nbsp;Bangkok, Thailand
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Wraps bodyText in a plain-text email with a simple header and footer.
 */
export function wrapText(title: string, bodyText: string): string {
  return `${title.toUpperCase()}\n${'='.repeat(title.length)}\n\n${bodyText}\n\n--\nRentOS\nhello@rentos.homes`;
}

/**
 * Returns an inline-styled CTA anchor element.
 */
export function button(label: string, url: string): string {
  return `<a href="${url}" target="_blank" style="display:inline-block;background-color:${SAFFRON};color:#FFFFFF;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;letter-spacing:0.2px;">${escapeHtml(label)}</a>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
