// Voices for every person, using the speech engine built into the phone or browser (free, works offline).
// On iPhone you can download better voices for free: Settings → Accessibility → Spoken Content → Voices.
let on = true, accents = true, vol = 1, voices = [], unlocked = false;
const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
export const supported = !!synth;

function load() { if (synth) voices = synth.getVoices() || [] }
if (synth) { load(); synth.onvoiceschanged = load; setTimeout(load, 500); setTimeout(load, 2000) }
// iPhone only lets speech start from a tap, so the first tap anywhere unlocks it.
if (synth && typeof addEventListener !== 'undefined') {
  const unlock = () => { if (unlocked) return; unlocked = true; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u) } catch (e) { } };
  addEventListener('pointerdown', unlock, { capture: true }); addEventListener('keydown', unlock, { capture: true });
}
export function setVoice(o) { if ('on' in o) on = o.on; if ('accents' in o) accents = o.accents; if ('vol' in o) vol = o.vol; if (!on) stop() }
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
export function say(text, who, { interrupt = true } = {}) {
  if (!synth || !on || !text) return;
  const t = speakable(text); if (!t || /^[.\s…]+$/.test(t)) return;
  if (t === last && Date.now() - lastT < 1500) return; last = t; lastT = Date.now();
  try {
    if (interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(t), v = pickVoice(who || { id: 'helper', flag: '🇺🇸' }), tn = tone(who || {});
    if (v) { u.voice = v; u.lang = v.lang }
    u.pitch = tn.pitch; u.rate = tn.rate; u.volume = vol;
    synth.speak(u);
    if (synth.paused) synth.resume();
  } catch (e) { }
}
export function stop() { try { synth && synth.cancel() } catch (e) { } }
export function voiceName(who) { const v = pickVoice(who); return v ? `${v.name} (${v.lang})` : 'none' }
