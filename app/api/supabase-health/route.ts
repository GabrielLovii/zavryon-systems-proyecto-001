import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || '';
  if (!url || !key) return NextResponse.json({ configured: false, connected: false, mode: 'demo-local' });
  try {
    const response = await fetch(`${url}/rest/v1/business_settings?select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    return NextResponse.json({ configured: true, connected: response.ok, mode: response.ok ? 'supabase' : 'demo-local' });
  } catch {
    return NextResponse.json({ configured: true, connected: false, mode: 'demo-local' });
  }
}
