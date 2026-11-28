// Push relay for Family Game Night (family-game-night-a47d2.web.app).
// Web pages can't send to Apple/Google/Mozilla push services directly (no CORS), so the app sends its already
// encrypted and signed notification here, and this forwards it unchanged. It holds no keys and can only reach
// push services, so it can't be used to read anything or to reach other sites.
// Everything that isn't /push is the Chess Coach app, served as static files.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/, /^([a-z0-9-]+\.)*push\.apple\.com$/, /^([a-z0-9-]+\.)*notify\.windows\.com$/, /^([a-z0-9-]+\.)*push\.microsoft\.com$/];
const ORIGINS = ['https://family-game-night-a47d2.web.app', 'https://family-game-night-a47d2.firebaseapp.com'];
const PASS = ['ttl', 'urgency', 'topic', 'content-encoding', 'content-type', 'authorization'];

function cors(req) {
  const o = req.headers.get('Origin') || '';
  return { 'Access-Control-Allow-Origin': o || ORIGINS[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (req, status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)) };

export async function relay(req, fetchImpl = fetch) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method === 'GET') return json(req, 200, { ok: true, relay: 'family-game-night push' });
  if (req.method !== 'POST') return json(req, 405, { error: 'POST only' });
  let m; try { m = await req.json() } catch (e) { return json(req, 400, { error: 'bad json' }) }
  let u; try { u = new URL(m.endpoint) } catch (e) { return json(req, 400, { error: 'bad endpoint' }) }
  if (u.protocol !== 'https:' || !PUSH_HOSTS.some(r => r.test(u.hostname))) return json(req, 400, { error: 'not a push service' });
  if (typeof m.body !== 'string' || m.body.length > 6000) return json(req, 400, { error: 'bad body' });
  const headers = {};
  for (const [k, v] of Object.entries(m.headers || {})) if (PASS.includes(k.toLowerCase()) && typeof v === 'string' && v.length < 2000) headers[k] = v;
  if (!/^vapid /.test(headers.Authorization || headers.authorization || '')) return json(req, 400, { error: 'missing vapid' });
  let body; try { body = unb64u(m.body) } catch (e) { return json(req, 400, { error: 'bad body' }) }
  const r = await fetchImpl(u.href, { method: 'POST', headers, body });
  let text = ''; try { text = (await r.text()).slice(0, 300) } catch (e) { }
  return json(req, 200, { status: r.status, text });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/push') return relay(req);
    return env.ASSETS.fetch(req);
  },
};
