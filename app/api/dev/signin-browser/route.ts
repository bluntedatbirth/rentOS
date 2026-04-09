import { NextResponse } from 'next/server';

// DEV ONLY — client-side sign-in page that works in embedded browsers
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

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

    // Set as a single cookie (createBrowserClient reads this)
    document.cookie = base + '=' + encodeURIComponent(sessionStr) + '; path=/; max-age=3600; SameSite=Lax';

    // Also set chunked format that some versions expect
    const chunks = sessionStr.match(/.{1,3600}/g) || [sessionStr];
    chunks.forEach((chunk, i) => {
      document.cookie = base + '.' + i + '=' + encodeURIComponent(chunk) + '; path=/; max-age=3600; SameSite=Lax';
    });

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
