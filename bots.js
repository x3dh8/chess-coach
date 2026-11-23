// Computer opponents. Every bot uses Stockfish, then picks a move the way its personality would.
import * as R from './rules.js';
import { analyse } from './engine.js';
import { PV, hanging } from './analysis.js';

import { PEOPLE, COACH_PEOPLE, VOICES, LEVELS } from './people.js';
export { LEVELS };

export const BOTS = PEOPLE.map(p => ({ ...p, color: p.face.bg, tag: p.bio }));
// Coaches play like a bot of the level you pick, but talk you through the game.
export const COACHES = COACH_PEOPLE.map(c => ({ ...c, color: c.face.bg }));
// Opponents from older versions of the app, so old games in your history still show a name.
export const LEGACY = [['pip', 'Pip', '🐣'], ['rusty', 'Rusty', '🤖'], ['daisy', 'Daisy', '🌼'], ['brick', 'Brick', '🧱'], ['zip', 'Zip', '⚡'], ['olive', 'Olive', '🫒'], ['gambito', 'Gambito', '🎩'], ['knightro', 'Knightro', '🐴'], ['bishopbea', 'Bea', '🐝'], ['pawnstorm', 'Stormy', '🌩️'], ['trader', 'Swap', '🔄'], ['queenie', 'Queenie', '👑'], ['professor', 'Professor Hoot', '🦉'], ['viper', 'Viper', '🐍'], ['fortress', 'Fortress', '🏰'], ['blaze', 'Blaze', '🔥'], ['frost', 'Frost', '❄️'], ['machine', 'The Machine', '🦾'], ['gm_ghost', 'Ghost GM', '👻'], ['titan', 'Titan', '🗿']].map(([id, name, emoji]) => ({ id, name, emoji, color: '#555', legacy: 1 }));
export const STYLE_NAMES = { chaos: 'Unpredictable', queen: 'Queen lover', aggressive: 'Attacker', solid: 'Solid', positional: 'Positional', gambit: 'Gambit player', trader: 'Endgame grinder', bishops: 'Bishop sniper', pawns: 'Pawn stormer', tactical: 'Tactician', knights: 'Knight lover', defensive: 'Defender', max: 'Perfect play' };
export const levelOf = r => { let l = LEVELS[0]; for (const x of LEVELS) if (r >= x[2]) l = x; return l };
// A chat line: the person's own lines first, otherwise their voice's lines.
export function line(bot, key) {
  const own = bot.say && bot.say[key], v = (VOICES[bot.voice] || VOICES.nice)[key];
  const pool = own && own.length && (!v || !v.length || Math.random() < .6) ? own : v;
  return pool && pool.length ? pick(pool) : '';
}
// How they look right now, from how the game is going for them (eval in centipawns, their point of view).
export function moodFor(bot, ev) {
  if (ev == null) return 'neutral';
  const cocky = ['cocky', 'grump', 'confident'].includes(bot.voice);
  return ev >= 600 ? (cocky ? 'smug' : 'happy') : ev >= 180 ? (cocky ? 'smug' : 'smile') : ev > -180 ? 'neutral' : ev > -600 ? 'worried' : 'sad';
}

export const COACH_LINES = {
  coach_sam: { best: ['Great move!', 'Nice, that’s exactly what I’d play.', 'Perfect!', 'Yes! That’s the one.'], good: ['Good move.', 'Solid.', 'That works.'], oops: ['Hmm, let’s look at that again.', 'Careful there!', 'Ooh, wait a second.'], brilliant: ['WOW. That’s brilliant!', 'Incredible! A real sacrifice!'], great: ['Great find! That was the only good move.'], hi: ['Hi! I’m Sam. Play your moves, and I’ll help you along the way. Ask for a hint any time!'] },
  coach_maya: { best: ['Excellent, that fits the plan.', 'Strong. You found the engine move.', 'Precise.'], good: ['Reasonable.', 'Fine, though there was something sharper.'], oops: ['Let’s pause here.', 'Think about what changed.', 'Hold on, this has a problem.'], brilliant: ['Brilliant! You saw deeper than most players would.'], great: ['Great move! Every other move was worse.'], hi: ['I’m Maya. I’ll point out the ideas behind the moves, both yours and mine.'] },
  coach_rex: { best: ['Good. Keep it up.', 'That’s the move.', 'Correct.'], good: ['Okay. Not the best.', 'Playable.'], oops: ['No. Look again.', 'That’s a problem.', 'You can do better than that.'], brilliant: ['Now THAT is chess!'], great: ['Only move. Well found.'], hi: ['Rex here. I won’t go easy, but I’ll make you better.'] },
};
export const pick = a => a[Math.floor(Math.random() * a.length)];

// Settings by strength: how deep it looks, how many choices it considers, how "loose" it plays.
function params(rating) {
  const t = [[250, 2, 8, 260, .32], [400, 3, 8, 180, .18], [550, 4, 7, 135, .11], [700, 5, 6, 100, .07], [850, 6, 6, 75, .045], [1000, 7, 5, 58, .03], [1200, 8, 5, 42, .018], [1400, 10, 4, 30, .01], [1600, 12, 4, 20, .005], [1800, 13, 3, 12, .002]];
  let p = t[0]; for (const x of t) if (rating >= x[0]) p = x;
  return { depth: p[1], multipv: p[2], temp: p[3], random: p[4] };
}
// Extra points (in centipawns) a bot gives moves it likes
function styleBonus(style, s, m) {
  const ns = R.makeMove(s, m), t = m.piece.toLowerCase(), me = s.turn, opp = R.other(me);
  const check = R.inCheck(ns, ns.turn), cap = !!m.captured;
  const oppK = R.findKing(s.board, opp), dist = sq => Math.max(Math.abs((sq & 7) - (oppK & 7)), Math.abs((sq >> 3) - (oppK >> 3)));
  const ply = (s.full - 1) * 2 + (me === 'b' ? 1 : 0);
  let b = 0;
  switch (style) {
    case 'aggressive': b += (check ? 35 : 0) + (cap ? 20 : 0) + (dist(m.to) < dist(m.from) ? 12 : 0); break;
    case 'tactical': b += (check ? 25 : 0) + (cap ? 15 : 0); break;
    case 'defensive': b += (m.flag && m.flag.startsWith('castle') ? 50 : 0) - (cap ? 5 : 0) + (t === 'p' && Math.abs((m.to & 7) - (R.findKing(s.board, me) & 7)) <= 1 ? 8 : 0); break;
    case 'solid': b += (m.flag && m.flag.startsWith('castle') ? 45 : 0) + ('nb'.includes(t) && ply < 16 ? 10 : 0); break;
    case 'gambit': b += (check ? 15 : 0) + (dist(m.to) < dist(m.from) ? 10 : 0) + (ply < 20 && t !== 'p' ? 8 : 0); break;
    case 'trader': b += cap && PV[m.captured.toLowerCase()] >= PV[t] - 1 ? 40 : 0; break;
    case 'pawns': b += t === 'p' ? 22 : 0; break;
    case 'knights': b += t === 'n' ? 25 : 0; break;
    case 'bishops': b += t === 'b' ? 22 : 0; break;
    case 'queen': b += t === 'q' ? (ply < 20 ? 35 : 15) : 0; break;
    case 'chaos': b += Math.random() * 80; break;
    case 'positional': b += (m.flag && m.flag.startsWith('castle') ? 25 : 0) + ([27, 28, 35, 36].includes(m.to) ? 8 : 0); break;
  }
  return b;
}
function repertoireMove(bot, s, sans) {
  if (!bot.rep || !bot.rep.length) return null;
  const n = sans.length, opts = bot.rep.map(l => l.split(' ')).filter(l => l.length > n && sans.every((x, i) => x.replace(/[+#]/g, '') === l[i].replace(/[+#]/g, ''))).map(l => l[n]);
  if (!opts.length || Math.random() < .1) return null;
  const m = R.sanToMove(s, opts[Math.floor(Math.random() * opts.length)]); return m ? R.moveToUci(m) : null;
}
// Pick a move for `bot` (or a coach playing at `rating`) in position s. sans = game so far.
export async function botMove(bot, s, sans, rating = bot.rating) {
  const L = R.legalMoves(s); if (!L.length) return null;
  const rep = repertoireMove(bot, s, sans); if (rep) return { uci: rep, book: true };
  const fen = R.toFEN(s);
  if (bot.style === 'max' || rating >= 3000) { const r = await analyse(fen, { movetime: 1500, tag: 'bot' }); return { uci: r.best || R.moveToUci(L[0]), eval: r.lines[0] ? ev(r.lines[0]) : null } }
  if (rating >= 2000) { const r = await analyse(fen, { movetime: 900, elo: rating, tag: 'bot' }); return { uci: r.best || R.moveToUci(L[0]), eval: r.lines[0] ? ev(r.lines[0]) : null } }
  const p = params(rating);
  if (Math.random() < p.random) return { uci: R.moveToUci(humanSlip(s, L, rating)), slip: true };
  const r = await analyse(fen, { depth: p.depth, multipv: Math.min(p.multipv, L.length), tag: 'bot' });
  if (!r.lines.length) return { uci: r.best || R.moveToUci(L[0]) };
  const top = r.lines[0].cp;
  // never miss mate in 1 above beginner level
  if (rating >= 600 && r.lines[0].mate === 1) return { uci: r.lines[0].uci, eval: 9999 };
  const scored = r.lines.map(l => { const m = R.uciToMove(s, l.uci, L); return { l, w: Math.exp(-Math.max(0, top - Math.min(l.cp, top + 300) - (m ? styleBonus(bot.style, s, m) : 0)) / p.temp) } });
  let tot = scored.reduce((a, x) => a + x.w, 0), x = Math.random() * tot;
  for (const sc of scored) { x -= sc.w; if (x <= 0) return { uci: sc.l.uci, eval: ev(sc.l) } }
  return { uci: r.lines[0].uci, eval: ev(r.lines[0]) };
}

const ev = l => l.mate != null ? (l.mate > 0 ? 9999 - l.mate : -9999 - l.mate) : l.cp;
// The kind of mistake a real person makes: a move that looks good at a glance
// (grabbing material, giving check, developing, going for the centre) without checking if it's safe.
function humanSlip(s, L, rating) {
  const ply = (s.full - 1) * 2 + (s.turn === 'b' ? 1 : 0), back = s.turn === 'w' ? 7 : 0;
  const score = m => {
    const t = m.piece.toLowerCase(), ns = R.makeMove(s, m), f = m.to & 7, r = m.to >> 3;
    let v = Math.random() * (rating < 500 ? 60 : 30);
    if (m.captured) v += PV[m.captured.toLowerCase()] * 14;
    if (R.inCheck(ns, ns.turn)) v += rating < 700 ? 30 : 16;
    if ('nb'.includes(t) && (m.from >> 3) === back && ply < 20) v += 14;
    if (f >= 2 && f <= 5 && r >= 2 && r <= 5) v += 6;
    if (t === 'q' && ply < 12) v += rating < 600 ? 14 : -4;
    if (t === 'k' && !(m.flag && m.flag.startsWith('castle'))) v -= 18;
    if (m.flag && m.flag.startsWith('castle')) v += 10;
    return v;
  };
  return L.map(m => [m, score(m)]).sort((a, b) => b[1] - a[1])[0][0];
}
