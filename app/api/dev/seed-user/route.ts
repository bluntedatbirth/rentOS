import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DEV ONLY — create test users with password auth
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role') === 'tenant' ? 'tenant' : 'landlord';

  const users = {
    landlord: {
      email: 'landlord@rentos.dev',
      password: 'test123456',
      full_name: 'Demo Landlord',
      phone: '081-234-5678',
    },
    tenant: {
      email: 'tenant@rentos.dev',
      password: 'test123456',
      full_name: 'Demo Tenant',
      phone: '089-876-5432',
    },
  };

  const u = users[role];

  const { data: user, error: createError } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { role, full_name: u.full_name, phone: u.phone },
  });

  if (createError && !createError.message.includes('already been registered')) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const userId = user?.user?.id;

  if (userId) {
    await admin.from('profiles').upsert({
      id: userId,
      role,
      full_name: u.full_name,
      phone: u.phone,
    });
  }

  return NextResponse.json({
    message: `Test ${role} user ready`,
    email: u.email,
    password: u.password,
  });
}
