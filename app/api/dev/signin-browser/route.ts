import { isDevEndpointAllowed } from '@/lib/devGuard';

// DEV ONLY — client-side sign-in page that works in embedded browsers
export async function GET() {
  if (!isDevEndpointAllowed()) return new Response(null, { status: 404 });

  const html = `<!DOCTYPE html>
<html>
<head><title>Dev Sign In</title></head>
<body>
<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

  const sb = createClient(
    '${process.env.NEXT_PUBLIC_SUPABASE_URL}',
    '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}'
  );

  const role = new URLSearchParams(location.search).get('role') || 'landlord';
  const email = role === 'tenant' ? 'tenant@rentos.dev' : 'landlord@rentos.dev';

  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: 'test123456',
  });

  if (error) {
    document.body.innerText = 'Error: ' + error.message;
  } else {
    // Store session in cookie format that @supabase/ssr expects
    const session = data.session;
    const base = 'sb-${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace('https://', '').split('.')[0]}-auth-token';

    // @supabase/ssr createBrowserClient stores as chunked cookies
    const sessionStr = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: session.user,
    });

    // @supabase/ssr createBrowserClient expects base64url-encoded cookies with 'base64-' prefix
    // Use TextEncoder for proper UTF-8 encoding (matching stringToBase64URL behaviour)
    const utf8Bytes = new TextEncoder().encode(sessionStr);
    const TO_B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let b64 = [], queue = 0, queuedBits = 0;
    for (const byte of utf8Bytes) {
      queue = (queue << 8) | byte; queuedBits += 8;
      while (queuedBits >= 6) { b64.push(TO_B64URL[(queue >> (queuedBits - 6)) & 63]); queuedBits -= 6; }
    }
    if (queuedBits > 0) { queue = queue << (6 - queuedBits); b64.push(TO_B64URL[(queue >> 0) & 63]); }
    const encoded = 'base64-' + b64.join('');

    // Set as a single cookie (createBrowserClient reads this)
    document.cookie = base + '=' + encoded + '; path=/; max-age=3600; SameSite=Lax';

    const dest = role === 'tenant' ? '/tenant/dashboard' : '/landlord/dashboard';
    window.location.href = dest;
  }
</script>
<p>Signing in...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
