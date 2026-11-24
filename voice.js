// Voices for every person, using the speech engine built into the phone or browser (free, works offline).
// On iPhone you can download better voices for free: Settings → Accessibility → Spoken Content → Voices.
let on = true, accents = true, vol = 1, voices = [], unlocked = false, engine = 'builtin';
const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
export const supported = !!synth || typeof Audio !== 'undefined';

function load() { if (synth) voices = synth.getVoices() || [] }
if (synth) { load(); synth.onvoiceschanged = load; setTimeout(load, 500); setTimeout(load, 2000) }
// iPhone only lets speech start from a tap, so the first tap anywhere unlocks it.
if (synth && typeof addEventListener !== 'undefined') {
  const unlock = () => { if (unlocked) return; unlocked = true; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u) } catch (e) { } };
  addEventListener('pointerdown', unlock, { capture: true }); addEventListener('keydown', unlock, { capture: true });
}
export function setVoice(o) {
  if ('on' in o) on = o.on; if ('accents' in o) accents = o.accents; if ('vol' in o) vol = o.vol;
  if ('engine' in o) engine = o.engine; if ('azKey' in o) az.key = (o.azKey || '').trim(); if ('azRegion' in o) az.region = (o.azRegion || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!on) stop();
}
export function count() { load(); return voices.filter(v => /^en/i.test(v.lang)).length }

// Known voice names on iPhone/Mac, Windows, Android and Chrome, so men sound like men and women like women.
const F = /samantha|karen|moira|tessa|fiona|veena|victoria|ava|allison|susan|zoe|nicky|martha|catherine|serena|kate|stephanie|noelle|joelle|alice|federica|paola|am[eé]lie|marie|audrey|anna|petra|helena|monica|m[oó]nica|paulina|isabela|luciana|joana|catarina|kyoko|o-ren|yuna|ting-?ting|mei-?jia|milena|katya|zosia|ellen|klara|alva|nora|sara|satu|laura|zuzana|ioana|mariska|melina|yelda|carmit|laila|lekha|kanya|damayanti|linh|amira|lana|zira|hazel|aria|jenny|emma|libby|sonia|natasha|clara|heera|female|salli|joanna|kendra|kimberly|ivy|amy|raveena|aditi|shelley|sandy|flo|grandma|siri.*(voice ?[24])/i;
const M = /\balex\b|daniel|rishi|fred|\btom\b|aaron|arthur|gordon|\blee\b|oliver|evan|nathan|luca|thomas|markus|yannick|jorge|juan|diego|felipe|otoya|hattori|sinji|yuri|krzysztof|xander|oskar|henrik|magnus|nikos|\bcem\b|maged|tarik|david|mark\b|george|guy|ryan|william|liam|brian|matthew|joey|justin|russell|ravi|male|reed|rocko|grandpa|ralph|albert|junior|siri.*(voice ?[13])/i;
const BAD = /albert|\bfred\b|junior|ralph|kathy|princess|bells|bad news|bahh|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|pipe organ/i;
// People's genders (for picking a voice)
const GENDER = { tommy: 'm', rosa: 'f', kofi: 'm', lily: 'f', diego: 'm', priya: 'f', lukas: 'm', amara: 'f', jake: 'm', mei: 'f', olek: 'm', sofia: 'f', marcus: 'm', yuki: 'm', nadia: 'f', dmitri: 'm', ana: 'f', henrik: 'm', leila: 'f', arjun: 'm', elena: 'f', theo: 'm', viktor: 'm', max: 'm', zoe: 'f', seamus: 'm', bella: 'f', tyrone: 'm', gus: 'm', hana: 'f', omar: 'm', ingrid: 'f', rafa: 'm', aisha: 'f', sergio: 'm', freya: 'f', minh: 'm', zara: 'f', bogdan: 'm', chloe: 'f', tariq: 'm', sasha: 'f', ravi: 'm', ernesto: 'm', coach_sam: 'm', coach_maya: 'f', coach_rex: 'm', helper: 'f' };
// Where they're from → the accent to try first
const LANG = { '🇺🇸': ['en-US'], '🇬🇧': ['en-GB'], '🇮🇪': ['en-IE', 'en-GB'], '🇦🇺': ['en-AU'], '🇳🇿': ['en-NZ', 'en-AU'], '🇨🇦': ['en-CA', 'en-US'], '🇮🇳': ['en-IN'], '🇱🇰': ['en-IN'], '🇸🇬': ['en-SG', 'en-IN', 'en-GB'], '🇯🇲': ['en-JM', 'en-GB'], '🇳🇬': ['en-NG', 'en-ZA'], '🇬🇭': ['en-GH', 'en-NG', 'en-ZA'], '🇰🇪': ['en-KE', 'en-ZA'], '🇵🇭': ['en-PH', 'en-US'],
  '🇮🇹': ['it'], '🇲🇽': ['es-MX', 'es'], '🇩🇪': ['de'], '🇵🇱': ['pl'], '🇪🇸': ['es-ES', 'es'], '🇯🇵': ['ja'], '🇫🇷': ['fr-FR', 'fr'], '🇺🇦': ['uk', 'ru'], '🇧🇷': ['pt-BR', 'pt'], '🇳🇴': ['nb', 'no', 'da'], '🇮🇷': ['fa', 'ar'], '🇷🇴': ['ro'], '🇳🇱': ['nl'], '🇦🇲': ['hy', 'ru'],
  '🇰🇷': ['ko'], '🇪🇬': ['ar'], '🇸🇪': ['sv'], '🇦🇷': ['es-AR', 'es-MX', 'es'], '🇵🇹': ['pt-PT', 'pt'], '🇮🇸': ['is', 'nb', 'sv'], '🇻🇳': ['vi'], '🇵🇰': ['ur', 'hi', 'en-IN'], '🇷🇸': ['sr', 'hr', 'ru'], '🇲🇦': ['ar', 'fr'], '🇰🇿': ['kk', 'ru'], '🇨🇺': ['es-US', 'es-MX', 'es'] };
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h };
const genderOf = v => F.test(v.name) ? 'f' : M.test(v.name) ? 'm' : null;
const cache = {};
function pickVoice(who) {
  load(); if (!voices.length) return null;
  const key = who.id + (accents ? 1 : 0) + voices.length; if (key in cache) return cache[key];
  const g = GENDER[who.id] || 'f', ok = voices.filter(v => !BAD.test(v.name));
  const want = [...(accents && LANG[who.flag] || []), ...(LANG[who.flag] || []).filter(l => l.startsWith('en')), 'en-US', 'en-GB', 'en'];
  let found = null;
  for (const l of want) {
    const pool = ok.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(l.toLowerCase()));
    if (!pool.length) continue;
    const good = q => /premium|enhanced|natural|neural|online|google/i.test(q.name) ? 0 : 1; // nicer voices first
    const same = pool.filter(v => genderOf(v) === g), any = same.length ? same : l.startsWith('en') ? [] : pool.filter(v => genderOf(v) !== (g === 'm' ? 'f' : 'm'));
    const list = (any.length ? any : []).sort((a, b) => good(a) - good(b));
    if (list.length) { const best = list.filter(v => good(v) === good(list[0])); found = best[hash(who.id) % best.length]; break }
  }
  if (!found) found = ok.find(v => /^en/i.test(v.lang)) || ok[0];
  return cache[key] = found;
}
// How they sound: kids higher and quicker, older people lower and slower
function tone(who) {
  const f = who.face || {}, h = (hash(who.id) % 9 - 4) / 100;
  let pitch = 1 + h, rate = 1;
  if (f.age === 'kid' || (who.age && who.age < 14)) { pitch = 1.38 + h; rate = 1.06 }
  else if (who.age && who.age < 20) { pitch = 1.12 + h; rate = 1.05 }
  if (f.age === 'old' || who.age >= 60) { pitch = .88 + h; rate = .9 }
  if (who.voice === 'grump') pitch -= .12;
  if (who.voice === 'hype' || who.voice === 'streamer' || who.voice === 'cocky') rate += .08;
  if (who.voice === 'quiet') rate -= .05;
  if (who.engine) { pitch = .55; rate = .92 }
  return { pitch: Math.max(.5, Math.min(1.9, pitch)), rate: Math.max(.7, Math.min(1.4, rate)) };
}
// Turn chat text into something nice to hear: no HTML, no emoji, chess moves read out properly.
const PIECE = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };
export function speakable(t) {
  let s = String(t).replace(/<span class="ns[^"]*">.*?<\/span>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
  s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/gu, '').replace(/[★✓✕]/g, '');
  s = s.replace(/\bO-O-O\b/g, 'castles queenside').replace(/\bO-O\b/g, 'castles');
  s = s.replace(/\b([KQRBN])?([a-h]?[1-8]?)(x)?([a-h][1-8])(=([QRBN]))?([+#])?(?=[\s.,!?:;)]|$)/g, (all, p, from, x, to, _, promo, ck) => {
    if (!p && !x && !from && !promo && !ck && !/^[a-h][1-8]$/.test(to)) return all;
    let w = (p ? PIECE[p] + ' ' : from && x ? from.toUpperCase() + ' ' : '') + (x ? 'takes ' : p ? '' : '') + to.toUpperCase().split('').join(' ');
    if (promo) w += ' promotes to ' + PIECE[promo]; if (ck === '+') w += ', check'; if (ck === '#') w += ', checkmate';
    return w;
  });
  return s.replace(/\s+/g, ' ').replace(/\s([.,!?:;])/g, '$1').trim();
}
let last = '', lastT = 0;
export function say(text, who, { interrupt = true, mood } = {}) {
  if (!on || !text) return;
  const t = speakable(text); if (!t || /^[.\s…]+$/.test(t)) return;
  if (t === last && Date.now() - lastT < 1500) return; last = t; lastT = Date.now();
  who = who || { id: 'helper', flag: '🇺🇸' };
  if (engine === 'azure' && az.key && az.region && !az.dead && navigator.onLine !== false && usage().chars + t.length < AZ_LIMIT) {
    azSay(t, who, interrupt, mood).catch(e => { console.warn('Azure voice failed, using built-in', e); builtinSay(t, who, interrupt) });
  } else builtinSay(t, who, interrupt);
}
function builtinSay(t, who, interrupt) {
  if (!synth) return;
  try {
    if (interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(t), v = pickVoice(who), tn = tone(who);
    if (v) { u.voice = v; u.lang = v.lang }
    u.pitch = tn.pitch; u.rate = tn.rate; u.volume = vol;
    synth.speak(u);
    if (synth.paused) synth.resume();
  } catch (e) { }
}
export function stop() { try { synth && synth.cancel() } catch (e) { } azStop() }
export function voiceName(who) { const v = pickVoice(who); return v ? `${v.name} (${v.lang})` : 'none' }

/* ---------------- Azure natural voices ----------------
   Free tier: 500,000 characters a month. The key is only stored on this device.
   Clips are saved on the device, so lines that repeat (greetings, "Check!") are free after the first time. */
const az = { key: '', region: '', list: null, dead: false, err: '' };
const AZ_LIMIT = 490000;
const UKEY = 'cxa-tts-usage', LKEY = 'cxa-az-voices';
const month = () => new Date().toISOString().slice(0, 7);
export function usage() { try { const u = JSON.parse(localStorage.getItem(UKEY)); if (u && u.m === month()) return u } catch (e) { } return { m: month(), chars: 0, clips: 0 } }
function addUsage(n) { const u = usage(); u.chars += n; u.clips++; try { localStorage.setItem(UKEY, JSON.stringify(u)) } catch (e) { } }
export const azureStatus = () => ({ ok: !!(az.list && az.list.length) && !az.dead, err: az.err, voices: az.list ? az.list.length : 0, limit: AZ_LIMIT });
try { const c = JSON.parse(localStorage.getItem(LKEY)); if (c && c.list) az.list = c.list } catch (e) { }
const base = () => `https://${az.region}.tts.speech.microsoft.com/cognitiveservices`;
// Check the key and get the list of voices (free, doesn't use characters)
export async function azureConnect(key, region) {
  if (key != null) az.key = key.trim(); if (region != null) az.region = region.trim().toLowerCase().replace(/\s+/g, '');
  az.dead = false; az.err = '';
  let r;
  try { r = await fetch(`${base()}/voices/list`, { headers: { 'Ocp-Apim-Subscription-Key': az.key } }) }
  catch (e) { az.err = 'Couldn’t reach Azure. Check the region and your internet.'; throw new Error(az.err) }
  if (r.status === 401 || r.status === 403) { az.err = 'That key doesn’t work for this region. Check both on the Azure page.'; throw new Error(az.err) }
  if (!r.ok) { az.err = `Azure said ${r.status}.`; throw new Error(az.err) }
  const all = await r.json();
  az.list = all.filter(v => /Neural$/.test(v.ShortName) && !/HD|Dragon|:/.test(v.ShortName)).map(v => ({ n: v.ShortName, l: v.Locale, g: v.Gender === 'Male' ? 'm' : 'f', s: v.StyleList || [], kid: /child|kid/i.test((v.VoiceTag && JSON.stringify(v.VoiceTag)) || '') || /^(en-US-AnaNeural|en-GB-MaisieNeural|en-AU-CarlyNeural)$/.test(v.ShortName), ml: /Multilingual/.test(v.ShortName) }));
  try { localStorage.setItem(LKEY, JSON.stringify({ list: az.list, at: Date.now() })) } catch (e) { }
  for (const k in azCache) delete azCache[k];
  return az.list.length;
}
// Accents: English voices from their country first; otherwise a voice from their country that can speak English.
const AZ_EN = { '🇺🇸': 'en-US', '🇬🇧': 'en-GB', '🇮🇪': 'en-IE', '🇦🇺': 'en-AU', '🇳🇿': 'en-NZ', '🇨🇦': 'en-CA', '🇮🇳': 'en-IN', '🇱🇰': 'en-IN', '🇸🇬': 'en-SG', '🇳🇬': 'en-NG', '🇬🇭': 'en-NG', '🇰🇪': 'en-KE', '🇵🇭': 'en-PH', '🇯🇲': 'en-GB' };
const AZ_NATIVE = { '🇮🇹': 'it-IT', '🇲🇽': 'es-MX', '🇩🇪': 'de-DE', '🇵🇱': 'pl-PL', '🇪🇸': 'es-ES', '🇯🇵': 'ja-JP', '🇫🇷': 'fr-FR', '🇺🇦': 'uk-UA', '🇧🇷': 'pt-BR', '🇳🇴': 'nb-NO', '🇮🇷': 'fa-IR', '🇷🇴': 'ro-RO', '🇳🇱': 'nl-NL', '🇦🇲': 'hy-AM', '🇰🇷': 'ko-KR', '🇪🇬': 'ar-EG', '🇸🇪': 'sv-SE', '🇦🇷': 'es-AR', '🇵🇹': 'pt-PT', '🇮🇸': 'is-IS', '🇻🇳': 'vi-VN', '🇵🇰': 'ur-PK', '🇷🇸': 'sr-RS', '🇲🇦': 'ar-MA', '🇰🇿': 'kk-KZ', '🇨🇺': 'es-US' };
const azCache = {}, used = {};
function azVoice(who) {
  if (azCache[who.id]) return azCache[who.id];
  const L = az.list || [], g = GENDER[who.id] || 'f', kid = (who.face && who.face.age === 'kid') || (who.age && who.age < 13);
  const h = hash(who.id), pickFrom = arr => { if (!arr.length) return null; const fresh = arr.filter(v => !used[v.n]); const a = fresh.length ? fresh : arr; return a[h % a.length] };
  let v = null;
  if (who.engine) v = L.find(x => x.n === 'en-US-RogerNeural') || pickFrom(L.filter(x => x.l === 'en-US' && x.g === 'm'));
  if (!v && kid) v = pickFrom(L.filter(x => x.kid && x.g === g && x.l.startsWith('en')));
  const en = AZ_EN[who.flag], nat = accents ? AZ_NATIVE[who.flag] : null;
  if (!v && en) v = pickFrom(L.filter(x => x.l === en && x.g === g && !x.kid));
  if (!v && nat) v = pickFrom(L.filter(x => x.l === nat && x.g === g && x.ml)) || pickFrom(L.filter(x => x.l.slice(0, 2) === nat.slice(0, 2) && x.g === g && x.ml));
  if (!v && nat) v = pickFrom(L.filter(x => x.l === nat && x.g === g));
  if (!v) v = pickFrom(L.filter(x => x.l === 'en-US' && x.g === g && !x.kid && !x.ml)) || L.find(x => x.l === 'en-US');
  if (v) used[v.n] = who.id;
  return azCache[who.id] = v;
}
export const azureVoiceName = who => { const v = azVoice(who); return v ? v.n : 'none' };
const xml = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const STYLE = { happy: ['cheerful', 'excited', 'friendly'], smile: ['friendly', 'cheerful'], smug: ['unfriendly', 'cheerful'], sad: ['sad', 'disgruntled'], worried: ['sad', 'terrified'], surprised: ['excited', 'cheerful'] };
function ssml(t, who, mood) {
  const v = azVoice(who); if (!v) return null;
  const tn = tone(who), kidLift = v.kid ? 0 : 0;
  const pitch = Math.round(((who.engine ? .9 : tn.pitch) - 1 + kidLift) * 45), rate = Math.round((tn.rate - 1) * 100);
  const style = mood && STYLE[mood] ? STYLE[mood].find(x => v.s.includes(x)) : null;
  let inner = `<prosody pitch="${pitch >= 0 ? '+' : ''}${pitch}%" rate="${rate >= 0 ? '+' : ''}${rate}%">${xml(t)}</prosody>`;
  if (v.ml && !v.l.startsWith('en')) inner = `<lang xml:lang="en-US">${inner}</lang>`;
  if (style) inner = `<mstts:express-as style="${style}">${inner}</mstts:express-as>`;
  return { v, body: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US"><voice name="${v.n}">${inner}</voice></speak>`, style };
}
// Saved clips on the device
const CACHE = 'chess-voice-v1';
async function cached(key) { try { const c = await caches.open(CACHE), r = await c.match(key); return r ? await r.blob() : null } catch (e) { return null } }
async function store(key, blob) { try { const c = await caches.open(CACHE); await c.put(key, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } })) } catch (e) { } }
// Playback: one audio element, unlocked by the first tap (iPhone needs that)
let audio = null, playing = Promise.resolve(), epoch = 0;
if (typeof Audio !== 'undefined' && typeof addEventListener !== 'undefined') {
  audio = new Audio(); audio.preload = 'auto';
  const unlockA = () => { removeEventListener('pointerdown', unlockA, true); try { audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='; audio.play().catch(() => { }) } catch (e) { } };
  addEventListener('pointerdown', unlockA, true);
}
function azStop() { epoch++; try { if (audio) { audio.pause(); audio.removeAttribute('src') } } catch (e) { } }
async function azSay(t, who, interrupt, mood) {
  if (!az.list) await azureConnect();
  const x = ssml(t, who, mood); if (!x) throw new Error('no voice');
  const key = `https://voice.local/${x.v.n}/${x.style || ''}/${hash(x.body)}`;
  if (interrupt) { azStop(); try { synth && synth.cancel() } catch (e) { } }
  const my = epoch;
  let blob = await cached(key);
  if (!blob) {
    const r = await fetch(`${base()}/v1`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': az.key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' }, body: x.body });
    if (r.status === 401 || r.status === 403) { az.dead = true; az.err = 'Azure key stopped working. Using built-in voices.'; throw new Error(az.err) }
    if (r.status === 429) throw new Error('busy or out of free characters');
    if (!r.ok) throw new Error('Azure ' + r.status);
    blob = await r.blob(); addUsage(t.length); store(key, blob);
  }
  const run = async () => {
    if (my !== epoch) return;
    const url = URL.createObjectURL(blob);
    await new Promise(res => { audio.onended = audio.onerror = res; audio.src = url; audio.volume = vol; audio.play().catch(res) });
    URL.revokeObjectURL(url);
  };
  if (interrupt) playing = run(); else playing = playing.then(run);
  return playing;
}
