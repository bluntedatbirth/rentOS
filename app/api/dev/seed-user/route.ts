import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DEV ONLY — create a test landlord user with password auth
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = 'landlord@rentos.dev';
  const password = 'test123456';

  // Try to create the user
  const { data: user, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'landlord', full_name: 'Demo Landlord', phone: '081-234-5678' },
  });

  if (createError && !createError.message.includes('already been registered')) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const userId = user?.user?.id;

  // Ensure profile exists
  if (userId) {
    await admin.from('profiles').upsert({
      id: userId,
      role: 'landlord',
      full_name: 'Demo Landlord',
      phone: '081-234-5678',
    });
  }

  return NextResponse.json({
    message: 'Test user ready',
    email,
    password,
    hint: 'Use POST /api/dev/signin with { email, password } to get a session',
  });
}
