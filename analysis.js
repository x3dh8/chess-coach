// Move grading (like chess.com Game Review), accuracy, estimated rating, and plain-English explanations.
import * as R from './rules.js';
import { isBookMove } from './book.js';

export const PV = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const PNAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
// Win chance (0-100) for the side to move, from centipawns (same curve chess.com/lichess use).
export const winP = cp => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, cp)))) - 1);
export const moveAcc = drop => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));

export const LABELS = {
  brilliant: { g: '!!', c: '#26c2a3', n: 'Brilliant' },
  great: { g: '!', c: '#5c8bb0', n: 'Great' },
  best: { g: '★', c: '#81b64c', n: 'Best' },
  excellent: { g: '👍', c: '#81b64c', n: 'Excellent' },
  good: { g: '✓', c: '#95b776', n: 'Good' },
  book: { g: '📖', c: '#d5a47d', n: 'Book' },
  inaccuracy: { g: '?!', c: '#f7c631', n: 'Inaccuracy' },
  mistake: { g: '?', c: '#ffa459', n: 'Mistake' },
  miss: { g: '✕', c: '#ff7769', n: 'Miss' },
  blunder: { g: '??', c: '#fa412d', n: 'Blunder' },
};
export const LABEL_ORDER = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
export const BAD = new Set(['inaccuracy', 'mistake', 'miss', 'blunder']);

// Cheapest attacker of `by` on a square (null if none)
export function minAttacker(b, sq, by) {
  const r = sq >> 3, c = sq & 7, up = by === 'w' ? 1 : -1, P = by === 'w' ? 'P' : 'p';
  const at = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? b[rr * 8 + cc] : undefined;
  if (at(r + up, c - 1) === P || at(r + up, c + 1) === P) return 1;
  const mine = p => p && R.colorOf(p) === by;
  for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) { const p = at(r + dr, c + dc); if (mine(p) && p.toLowerCase() === 'n') return 3 }
  let best = null;
  const ray = (dirs, kinds) => { for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (mine(p) && kinds.includes(p.toLowerCase())) { const v = PV[p.toLowerCase()] || 100; if (best == null || v < best) best = v } break } rr += dr; cc += dc } } };
  ray([[-1, -1], [-1, 1], [1, -1], [1, 1]], 'bq'); ray([[-1, 0], [1, 0], [0, -1], [0, 1]], 'rq');
  if (best == null) for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) { const p = at(r + dr, c + dc); if (mine(p) && p.toLowerCase() === 'k') best = 100 }
  return best;
}
// Pieces of `col` (knight or better) the other side can win right now: [{sq, v}]
export function hanging(b, col, minV = 3) {
  const opp = R.other(col), out = [];
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || R.colorOf(p) !== col) continue;
    const pv = PV[p.toLowerCase()]; if (pv < minV) continue;
    const a = minAttacker(b, i, opp); if (a == null) continue;
    if (a < pv || !R.attacked(b, i, col)) out.push({ sq: i, v: pv });
  }
  return out;
}
const maxHang = (b, col) => hanging(b, col).reduce((m, h) => Math.max(m, h.v), 0);
export function isSac(s, m, ns) {
  if (!m || (R.inCheck(ns, ns.turn) && !R.legalMoves(ns).length)) return false;
  const me = R.colorOf(m.piece), after = maxHang(ns.board, me);
  if (after < 3) return false;
  const gained = m.captured ? PV[m.captured.toLowerCase()] : 0;
  if (gained >= after) return false;
  return after > maxHang(s.board, me);
}

/* Grade move i of a game.
   ev[i] = analysis of the position BEFORE move i: { best, lines:[{uci,cp}] } (cp for the side to move)
   Returns { label, acc, drop (win% lost), best, wpBefore, wpAfter } */
export function gradeMove(g, i, ev, prevLabel) {
  const a = ev[i], b = ev[i + 1]; if (!a || !b || !a.lines || !a.lines.length) return null;
  const s = g.states[i], ns = g.states[i + 1], m = g.moves[i], uci = R.moveToUci(m);
  const bestCp = a.lines[0].cp, afterCp = b.lines && b.lines.length ? -b.lines[0].cp : (R.inCheck(ns, ns.turn) ? 100000 : 0);
  const wpBest = winP(bestCp), wpAfter = winP(afterCp), drop = Math.max(0, wpBest - wpAfter);
  const acc = moveAcc(drop), isBest = uci === a.lines[0].uci || drop < 0.5;
  let label;
  if (i < 30 && isBookMove(s, uci)) label = 'book';
  else if (isBest) {
    const second = a.lines[1] ? winP(a.lines[1].cp) : null;
    if (isSac(s, m, ns) && wpAfter >= 45 && wpBest < 97 && R.legalMoves(ns).length) label = 'brilliant';
    // Great: the only good move (the next-best loses a lot), and it changes the game: not just a recapture
    else if (second != null && wpBest - second >= 18 && wpBest < 97 && !(m.captured && g.moves[i - 1] && g.moves[i - 1].captured && g.moves[i - 1].to === m.to)) label = 'great';
    else label = 'best';
  } else if (drop < 2) label = 'excellent';
  else if (drop < 5) label = 'good';
  else if (drop < 10) label = 'inaccuracy';
  else if (drop < 20) label = 'mistake';
  else label = 'blunder';
  // Miss: the opponent just slipped up and this move didn't take the chance
  if (['inaccuracy', 'mistake', 'blunder'].includes(label) && (prevLabel === 'mistake' || prevLabel === 'blunder' || prevLabel === 'miss') && wpBest >= 60 && drop >= 8 && wpAfter >= 25) label = 'miss';
  return { label, acc, drop, best: a.lines[0].uci, bestCp, afterCp, wpBefore: wpBest, wpAfter };
}
export function gradeGame(g, ev) {
  const out = []; let prev = null;
  for (let i = 0; i < g.moves.length; i++) { const r = gradeMove(g, i, ev, prev); out.push(r); prev = r ? r.label : null }
  return out;
}
// chess.com-style accuracy: mix of the average and the harmonic mean, so one blunder hurts.
export function accuracy(grades, col) {
  const a = grades.filter((x, i) => x && (i % 2 === 0) === (col === 'w')).map(x => x.acc);
  if (!a.length) return null;
  const mean = a.reduce((p, c) => p + c, 0) / a.length, harm = a.length / a.reduce((p, c) => p + 1 / Math.max(c, 1), 0);
  return (mean * 0.6 + harm * 0.4);
}
// A rough "you played like a ___ rated player this game" from accuracy and the opponent's strength.
export function estRating(acc, oppRating, nMoves) {
  if (acc == null) return null;
  const pts = [[30, 250], [45, 500], [55, 750], [63, 1000], [70, 1250], [76, 1500], [81, 1750], [85, 2000], [89, 2250], [92, 2500], [95, 2750], [98, 3000]];
  let r = pts[0][1];
  for (let k = 0; k < pts.length - 1; k++) { const [a1, r1] = pts[k], [a2, r2] = pts[k + 1]; if (acc >= a1) r = acc >= a2 ? r2 : r1 + (r2 - r1) * (acc - a1) / (a2 - a1) }
  if (oppRating && nMoves >= 12) r = r * 0.8 + oppRating * 0.2; // accuracy is easier against weak play
  return Math.round(r / 25) * 25;
}

/* ---------- plain-English coaching ---------- */
export const sanOf = (s, uci) => { if (!uci) return ''; const L = R.legalMoves(s), m = R.uciToMove(s, uci, L); return m ? R.toSAN(s, m, L) : uci };
export function whatItDoes(s, m) {
  if (!m) return '';
  const ns = R.makeMove(s, m), t = m.piece.toLowerCase(), opp = R.other(s.turn);
  if (R.inCheck(ns, ns.turn) && !R.legalMoves(ns).length) return "it's checkmate";
  if (m.flag === 'castleK' || m.flag === 'castleQ') return 'it castles your king to safety and brings a rook into the game';
  if (m.promo) return 'it makes a new queen';
  const hits = [];
  for (let i = 0; i < 64; i++) { const p = ns.board[i]; if (p && R.colorOf(p) === opp && (PV[p.toLowerCase()] >= 3 || p.toLowerCase() === 'k')) { if (R.attacked(ns.board, i, s.turn) && !R.attacked(s.board, i, s.turn)) hits.push(p) } }
  if (m.captured) { const v = PV[m.captured.toLowerCase()]; return hits.length >= 2 ? `it takes their ${PNAME[m.captured.toLowerCase()]} and attacks two more pieces` : `it wins their ${PNAME[m.captured.toLowerCase()]}${v >= 3 && !minAttacker(ns.board, m.to, opp) ? ' for free' : ''}` }
  if (hits.length >= 2) return `it attacks ${hits.map(p => 'their ' + PNAME[p.toLowerCase()]).slice(0, 2).join(' and ')} at the same time (a fork!)`;
  if (R.inCheck(ns, ns.turn)) return 'it checks their king and keeps the pressure on';
  if (hits.length) return `it attacks their ${PNAME[hits[0].toLowerCase()]}`;
  const myHang = hanging(s.board, s.turn), nowHang = hanging(ns.board, s.turn);
  if (myHang.length && nowHang.length < myHang.length) return `it saves your ${PNAME[s.board[myHang[0].sq].toLowerCase()]}`;
  const home = s.turn === 'w' ? 7 : 0;
  if ('nb'.includes(t) && (m.from >> 3) === home) return 'it develops a piece toward the center';
  if (t === 'p' && [27, 28, 35, 36].includes(m.to)) return 'it takes space in the center';
  if (t === 'r' && !ns.board.some((p, i) => (i & 7) === (m.to & 7) && p && p.toLowerCase() === 'p' && i !== m.to)) return 'it puts a rook on an open file';
  return 'it improves your position';
}
/* Why move i was a problem, in words. ev as in gradeMove. youName/oppName for the sentence. */
export function explainMistake(g, i, ev, oppName = 'they') {
  const s = g.states[i], ns = g.states[i + 1], m = g.moves[i], a = ev[i], b = ev[i + 1];
  const san = g.sans[i];
  const best = a && a.lines[0] ? R.uciToMove(s, a.lines[0].uci) : null, bestSan = best ? sanOf(s, a.lines[0].uci) : '';
  const replyU = b && b.lines && b.lines[0] ? b.lines[0].uci : null, reply = replyU ? R.uciToMove(ns, replyU) : null, replySan = reply ? sanOf(ns, replyU) : '';
  const better = bestSan ? ` ${bestSan} was better: ${whatItDoes(s, best)}.` : '';
  if (b && b.lines && b.lines[0] && b.lines[0].cp > 90000) { const n = b.lines[0].mate; return `${san} lets ${oppName} checkmate you${n && n < 15 ? ` in ${n}` : ''}, starting with ${replySan}.${better}` }
  if (a && a.lines[0] && a.lines[0].cp > 90000 && !(b && b.lines[0] && -b.lines[0].cp > 90000)) return `You had checkmate! ${bestSan} ${a.lines[0].mate === 1 ? 'is mate right away' : `forces mate in ${a.lines[0].mate}`}. Always look at every check first.`;
  if (reply && reply.captured && PV[reply.captured.toLowerCase()] >= 1) {
    const lost = PNAME[reply.captured.toLowerCase()], where = R.sqName(reply.to);
    if (reply.to === m.to) return `${san} puts your ${PNAME[(m.promo || m.piece).toLowerCase()]} on ${where}, where it can be taken by ${replySan}.${better}`;
    return `After ${san}, your ${lost} on ${where} isn't protected anymore, so ${replySan} wins it.${better}`;
  }
  if (best && best.captured && PV[best.captured.toLowerCase()] >= 3) return `You missed a free ${PNAME[best.captured.toLowerCase()]}! ${bestSan} takes it. Before every move, check: can I take something?`;
  if (reply && R.inCheck(R.makeMove(ns, reply), s.turn)) return `${san} allows a strong check: ${replySan}.${better}`;
  if (reply) { const rm = R.makeMove(ns, reply), hits = hanging(rm.board, s.turn); if (hits.length >= 2) return `${san} allows ${replySan}, which attacks two of your pieces at once.${better}` }
  const pawns = a && b && a.lines[0] && b.lines[0] ? Math.max(0, (a.lines[0].cp + b.lines[0].cp) / 100) : 0;
  return `${san} isn't the best here${pawns >= 1 && pawns < 50 ? `, it gives away about ${pawns.toFixed(1)} pawns of advantage` : ''}.${better || ' Look for your worst piece and improve it.'}`;
}
// Things the opponent is now threatening after their move (for the coach's warnings)
export function threatsAgainst(s, col) {
  // s = position with `col` to move. What of ours is hanging?
  const h = hanging(s.board, col).sort((a, b) => b.v - a.v);
  return h.map(x => ({ sq: x.sq, piece: PNAME[s.board[x.sq].toLowerCase()], v: x.v }));
}
// A hint in 3 steps: which piece, which square area, the move.
export function hintFor(s, uci) {
  const m = R.uciToMove(s, uci); if (!m) return null;
  return { piece: PNAME[m.piece.toLowerCase()], from: m.from, to: m.to, what: whatItDoes(s, m), san: sanOf(s, uci) };
}
