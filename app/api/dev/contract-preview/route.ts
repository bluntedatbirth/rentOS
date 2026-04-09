import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// DEV ONLY — return the latest contract with extracted clauses as HTML
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const url = new URL(request.url);
  const contractId = url.searchParams.get('id');

  let query = adminClient.from('contracts').select('*').not('structured_clauses', 'is', null);

  if (contractId) {
    query = query.eq('id', contractId);
  } else {
    query = query.order('created_at', { ascending: false }).limit(1);
  }

  const { data: contract } = await query.single();

  if (!contract) {
    return new Response('<h1>No contract with extracted clauses found</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const clauses =
    (contract.structured_clauses as Array<{
      clause_id: string;
      title_th: string;
      title_en: string;
      text_th: string;
      text_en: string;
      category: string;
      penalty_defined: boolean;
      penalty_amount: number | null;
      penalty_currency: string | null;
      penalty_description: string | null;
    }>) ?? [];

  const categoryColors: Record<string, string> = {
    payment: '#3b82f6',
    deposit: '#8b5cf6',
    maintenance: '#f59e0b',
    pets: '#ef4444',
    termination: '#6b7280',
    utilities: '#10b981',
    noise: '#f97316',
    penalties: '#dc2626',
    renewal: '#06b6d4',
    subletting: '#84cc16',
    other: '#9ca3af',
  };

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RentOS Contract Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat { background: white; padding: 16px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
    .lang-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
    .lang-btn { padding: 8px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
    .lang-btn.active { background: #2563eb; color: white; }
    .lang-btn:not(.active) { background: #e2e8f0; color: #475569; }
    .clause { background: white; border-radius: 12px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #e2e8f0; }
    .clause-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .clause-title { font-weight: 700; font-size: 16px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
    .penalty-badge { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; margin-top: 10px; display: inline-block; }
    .clause-text { font-size: 14px; line-height: 1.7; color: #334155; }
    .text-en { display: none; }
    .show-en .text-th { display: none; }
    .show-en .text-en { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 RentOS — Contract OCR Result</h1>
    <p class="subtitle">PDF uploaded → Claude extracted ${clauses.length} clauses with Thai/English translation</p>

    <div class="summary">
      <div class="stat">
        <div class="stat-label">Lease Period</div>
        <div class="stat-value" style="font-size:14px">${contract.lease_start ?? '—'} → ${contract.lease_end ?? '—'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Monthly Rent</div>
        <div class="stat-value">฿${(contract.monthly_rent ?? 0).toLocaleString()}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Security Deposit</div>
        <div class="stat-value">฿${(contract.security_deposit ?? 0).toLocaleString()}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Clauses</div>
        <div class="stat-value">${clauses.length}</div>
      </div>
    </div>

    <div class="lang-toggle">
      <button class="lang-btn active" onclick="setLang('th')">🇹🇭 ไทย</button>
      <button class="lang-btn" onclick="setLang('en')">🇬🇧 English</button>
    </div>

    ${clauses
      .map(
        (c) => `
    <div class="clause" style="border-left-color: ${categoryColors[c.category] ?? '#9ca3af'}">
      <div class="clause-header">
        <span class="clause-title text-th">${c.title_th}</span>
        <span class="clause-title text-en">${c.title_en}</span>
        <span class="badge" style="background: ${categoryColors[c.category] ?? '#9ca3af'}">${c.category}</span>
      </div>
      <div class="clause-text text-th">${c.text_th}</div>
      <div class="clause-text text-en">${c.text_en}</div>
      ${c.penalty_defined ? `<div class="penalty-badge">⚠️ Penalty: ฿${(c.penalty_amount ?? 0).toLocaleString()} ${c.penalty_currency ?? ''} — ${c.penalty_description ?? ''}</div>` : ''}
    </div>`
      )
      .join('')}
  </div>

  <script>
    function setLang(lang) {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      if (lang === 'en') document.querySelector('.container').classList.add('show-en');
      else document.querySelector('.container').classList.remove('show-en');
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
