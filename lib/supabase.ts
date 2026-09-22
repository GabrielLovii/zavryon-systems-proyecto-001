import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}

export type SupabaseTable = 'business_settings' | 'suppliers' | 'products' | 'orders';

export async function readSupabaseTable<T = Record<string, unknown>>(table: SupabaseTable) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null as T[] | null, error: new Error('Supabase no configurado') };
  const { data, error } = await supabase.from(table).select('*');
  return { data: data as T[] | null, error };
}
