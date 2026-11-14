/**
 * Supabase REST/Auth integration. Only the public anon key is used in the browser.
 * Database access is protected by RLS; never put a service_role key in this file.
 */
const URL = (import.meta as any).env?.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
const ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
const TOKEN_KEY = 'deepika_supabase_access_token';
const REFRESH_KEY = 'deepika_supabase_refresh_token';

export const supabaseConfigured = Boolean(URL && ANON);
export const hasSupabaseSession = () => Boolean(localStorage.getItem(TOKEN_KEY));
const token = () => localStorage.getItem(TOKEN_KEY) || ANON;
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  const response = await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok) return false;
  const data = await response.json();
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  return true;
}

async function request(path: string, init: RequestInit = {}) {
  if (!supabaseConfigured) throw new Error('Supabase configure nahi hai. .env file mein URL aur anon key set karein.');
  const headers = new Headers(init.headers || {});
  headers.set('apikey', ANON);
  headers.set('Authorization', `Bearer ${token()}`);
  headers.set('Content-Type', 'application/json');
  let response = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers });
  if (response.status === 401 && await refreshAccessToken()) {
    headers.set('Authorization', `Bearer ${token()}`);
    response = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers });
  }
  const body = await response.text();
  if (!response.ok) throw new Error(body || `Supabase error ${response.status}`);
  return body ? JSON.parse(body) : null;
}

export async function supabaseOwnerLogin(email: string, password: string) {
  if (!supabaseConfigured) throw new Error('Supabase URL / anon key missing hai. .env file configure karein.');
  const response = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.msg || 'Supabase login failed');
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  return data.user;
}

export async function supabaseStaffLogin(loginId: string, password: string) {
  const email = loginId.includes('@') ? loginId : `${loginId}@staff.deepika.local`;
  return supabaseOwnerLogin(email, password);
}

export async function supabaseOwnerLogout() {
  if (supabaseConfigured && localStorage.getItem(TOKEN_KEY)) {
    try {
      await fetch(`${URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${token()}` }
      });
    } catch { /* local logout must still work */ }
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function supabaseGetLedger(kind?: 'booking' | 'daily') {
  const filter = kind ? `&kind=eq.${kind}` : '';
  return (await request(`ledger_entries?select=id,kind,payload,created_at,updated_at&order=created_at.desc${filter}`)) as any[];
}

export async function supabaseSaveLedger(kind: 'booking' | 'daily', entry: any, isNew = false): Promise<string> {
  const makeRow = (id: string) => ({
    id, kind, payload: { ...entry, id, synced: true }, updated_at: new Date().toISOString()
  });
  if (isNew) {
    try {
      await request('ledger_entries', {
        method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(makeRow(entry.id))
      });
      return entry.id;
    } catch (err: any) {
      // Simultaneous entry on another device can claim B-001 first; never overwrite it.
      const message = String(err?.message || err);
      if (!message.includes('23505') && !message.toLowerCase().includes('duplicate key')) throw err;
      const fallbackId = `${entry.id}-${Date.now().toString().slice(-6)}`;
      await request('ledger_entries', {
        method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(makeRow(fallbackId))
      });
      return fallbackId;
    }
  }
  await request('ledger_entries?on_conflict=id,kind', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(makeRow(entry.id))
  });
  return entry.id;
}

export async function supabaseDeleteLedger(kind: 'booking' | 'daily', id: string) {
  await request(`ledger_entries?id=eq.${encodeURIComponent(id)}&kind=eq.${kind}`, { method: 'DELETE' });
}
