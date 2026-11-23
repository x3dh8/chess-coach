// Chess rules: move generation, legality, SAN, FEN. Shared by the game screen and the engine worker.
export const FILES = 'abcdefgh';
export const colorOf = p => p ? (p === p.toUpperCase() ? 'w' : 'b') : null;
export const other = c => c === 'w' ? 'b' : 'w';
export const sqName = i => FILES[i & 7] + (8 - (i >> 3));
export const sqIndex = n => (8 - +n[1]) * 8 + FILES.indexOf(n[0]);

export function initState() {
  return fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
}
export function fromFEN(f) {
  const [pl, t, c, e, h, fu] = f.trim().split(/\s+/);
  const board = [];
  for (const ch of pl.replace(/\//g, '')) {
    if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) board.push(null); else board.push(ch);
  }
  return {
    board, turn: t || 'w',
    castle: { K: (c || '').includes('K'), Q: (c || '').includes('Q'), k: (c || '').includes('k'), q: (c || '').includes('q') },
    ep: e && e !== '-' ? sqIndex(e) : -1, half: +(h || 0), full: +(fu || 1)
  };
}
export function toFEN(s) {
  let out = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = s.board[r * 8 + c];
      if (!p) empty++; else { if (empty) { out += empty; empty = 0 } out += p }
    }
    if (empty) out += empty;
    if (r < 7) out += '/';
  }
  const cs = (s.castle.K ? 'K' : '') + (s.castle.Q ? 'Q' : '') + (s.castle.k ? 'k' : '') + (s.castle.q ? 'q' : '');
  return `${out} ${s.turn} ${cs || '-'} ${s.ep >= 0 ? sqName(s.ep) : '-'} ${s.half} ${s.full}`;
}

const N_OFF = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const K_OFF = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const B_DIR = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const R_DIR = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const Q_DIR = B_DIR.concat(R_DIR);

export function attacked(b, sq, by) {
  const r = sq >> 3, c = sq & 7;
  const pawn = by === 'w' ? 'P' : 'p', pr = by === 'w' ? r + 1 : r - 1;
  if (pr >= 0 && pr < 8) {
    if (c > 0 && b[pr * 8 + c - 1] === pawn) return true;
    if (c < 7 && b[pr * 8 + c + 1] === pawn) return true;
  }
  const kn = by === 'w' ? 'N' : 'n';
  for (const [dr, dc] of N_OFF) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === kn) return true }
  const kg = by === 'w' ? 'K' : 'k';
  for (const [dr, dc] of K_OFF) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === kg) return true }
  const diag = by === 'w' ? 'BQ' : 'bq', orth = by === 'w' ? 'RQ' : 'rq';
  for (const [dr, dc] of B_DIR) {
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (diag.includes(p)) return true; break } rr += dr; cc += dc }
  }
  for (const [dr, dc] of R_DIR) {
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (orth.includes(p)) return true; break } rr += dr; cc += dc }
  }
  return false;
}
export const findKing = (b, col) => b.indexOf(col === 'w' ? 'K' : 'k');
export const inCheck = (s, col) => attacked(s.board, findKing(s.board, col), other(col));

// premove=true: generate moves as if it were `s.turn`'s move, allowing captures of any square a piece
// could attack (own pieces included) and ignoring castling-through-check, like chess.com premoves.
export function pseudoMoves(s, capturesOnly = false, premove = false) {
  const b = s.board, us = s.turn, them = other(us), moves = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]; if (!p || colorOf(p) !== us) continue;
    const r = sq >> 3, c = sq & 7, t = p.toLowerCase();
    const push = (to, extra) => {
      const m = { from: sq, to, piece: p, captured: (b[to] && colorOf(b[to]) === them) ? b[to] : null };
      if (extra) Object.assign(m, extra);
      if (!capturesOnly || m.captured || m.promo) moves.push(m);
    };
    const canLand = to => !b[to] || colorOf(b[to]) === them || premove;
    if (t === 'p') {
      const dir = us === 'w' ? -1 : 1, start = us === 'w' ? 6 : 1, last = us === 'w' ? 0 : 7, r1 = r + dir;
      if (r1 < 0 || r1 > 7) continue;
      const pushPawn = (to, extra) => {
        if (r1 === last) for (const q of 'qrbn') push(to, Object.assign({ promo: us === 'w' ? q.toUpperCase() : q }, extra || {}));
        else push(to, extra);
      };
      const fwd = r1 * 8 + c;
      if (!b[fwd] || premove) {
        pushPawn(fwd);
        const two = (r + 2 * dir) * 8 + c;
        if (r === start && ((!b[fwd] && !b[two]) || premove)) push(two, { flag: 'double' });
      }
      for (const dc of [-1, 1]) {
        const cc = c + dc; if (cc < 0 || cc > 7) continue;
        const to = r1 * 8 + cc;
        if (premove) pushPawn(to);
        else if (b[to] && colorOf(b[to]) === them) pushPawn(to);
        else if (to === s.ep) push(to, { flag: 'ep', captured: us === 'w' ? 'p' : 'P' });
      }
    } else if (t === 'n' || t === 'k') {
      for (const [dr, dc] of (t === 'n' ? N_OFF : K_OFF)) {
        const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const to = rr * 8 + cc; if (canLand(to)) push(to);
      }
      if (t === 'k' && !capturesOnly) {
        const home = us === 'w' ? 60 : 4, R = us === 'w' ? 'R' : 'r';
        const ks = us === 'w' ? 'K' : 'k', qs = us === 'w' ? 'Q' : 'q';
        if (sq === home && (premove || !attacked(b, home, them))) {
          if (s.castle[ks] && b[home + 3] === R && (premove || (!b[home + 1] && !b[home + 2] &&
            !attacked(b, home + 1, them) && !attacked(b, home + 2, them)))) push(home + 2, { flag: 'castleK' });
          if (s.castle[qs] && b[home - 4] === R && (premove || (!b[home - 1] && !b[home - 2] && !b[home - 3] &&
            !attacked(b, home - 1, them) && !attacked(b, home - 2, them)))) push(home - 2, { flag: 'castleQ' });
        }
      }
    } else {
      const dirs = t === 'b' ? B_DIR : t === 'r' ? R_DIR : Q_DIR;
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const to = rr * 8 + cc;
          if (!b[to]) push(to);
          else { if (canLand(to)) push(to); if (!premove) break; }
          rr += dr; cc += dc;
        }
      }
    }
  }
  return moves;
}

export function makeMove(s, m) {
  const b = s.board.slice(), us = s.turn;
  b[m.to] = m.promo || m.piece; b[m.from] = null;
  if (m.flag === 'ep') b[m.to + (us === 'w' ? 8 : -8)] = null;
  if (m.flag === 'castleK') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null }
  if (m.flag === 'castleQ') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null }
  const castle = { K: s.castle.K, Q: s.castle.Q, k: s.castle.k, q: s.castle.q };
  if (m.piece === 'K') castle.K = castle.Q = false;
  if (m.piece === 'k') castle.k = castle.q = false;
  if (m.from === 63 || m.to === 63) castle.K = false;
  if (m.from === 56 || m.to === 56) castle.Q = false;
  if (m.from === 7 || m.to === 7) castle.k = false;
  if (m.from === 0 || m.to === 0) castle.q = false;
  const isPawn = m.piece === 'P' || m.piece === 'p';
  return {
    board: b, turn: other(us), castle,
    ep: m.flag === 'double' ? (m.from + m.to) / 2 : -1,
    half: (isPawn || m.captured) ? 0 : s.half + 1,
    full: s.full + (us === 'b' ? 1 : 0)
  };
}

export function legalMoves(s) {
  return pseudoMoves(s).filter(m => {
    const ns = makeMove(s, m);
    return !attacked(ns.board, findKing(ns.board, s.turn), ns.turn);
  });
}

export function toSAN(s, m, legals) {
  let san;
  if (m.flag === 'castleK') san = 'O-O';
  else if (m.flag === 'castleQ') san = 'O-O-O';
  else {
    const t = m.piece.toLowerCase();
    if (t === 'p') san = (m.captured ? FILES[m.from & 7] + 'x' : '') + sqName(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
    else {
      let dis = '';
      const others = (legals || legalMoves(s)).filter(o => o.piece === m.piece && o.to === m.to && o.from !== m.from);
      if (others.length) {
        const sameFile = others.some(o => (o.from & 7) === (m.from & 7));
        const sameRank = others.some(o => (o.from >> 3) === (m.from >> 3));
        dis = !sameFile ? FILES[m.from & 7] : !sameRank ? String(8 - (m.from >> 3)) : sqName(m.from);
      }
      san = t.toUpperCase() + dis + (m.captured ? 'x' : '') + sqName(m.to);
    }
  }
  const ns = makeMove(s, m);
  if (inCheck(ns, ns.turn)) san += legalMoves(ns).length ? '+' : '#';
  return san;
}

export const moveToUci = m => sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : '');
export function uciToMove(s, uci, legals) {
  if (!uci || uci.length < 4) return null;
  const from = sqIndex(uci.slice(0, 2)), to = sqIndex(uci.slice(2, 4)), pr = uci[4];
  return (legals || legalMoves(s)).find(m => m.from === from && m.to === to && (!m.promo || m.promo.toLowerCase() === (pr || 'q'))) || null;
}
export function sanToMove(s, san, legals) {
  const clean = x => x.replace(/[+#!?]/g, '').replace(/0/g, 'O');
  const L = legals || legalMoves(s);
  return L.find(m => clean(toSAN(s, m, L)) === clean(san)) || null;
}

export const posKey = s => s.board.map(p => p || '.').join('') + s.turn +
  (s.castle.K ? 'K' : '') + (s.castle.Q ? 'Q' : '') + (s.castle.k ? 'k' : '') + (s.castle.q ? 'q' : '') + s.ep;

export function insufficient(b) {
  const pcs = b.filter(p => p && p !== 'k' && p !== 'K');
  if (!pcs.length) return true;
  if (pcs.length === 1 && 'nNbB'.includes(pcs[0])) return true;
  if (pcs.every(p => p === 'b' || p === 'B')) {
    const shades = new Set(); b.forEach((p, i) => { if (p === 'b' || p === 'B') shades.add(((i >> 3) + (i & 7)) & 1) });
    return shades.size === 1;
  }
  return false;
}
// Can `col` still possibly checkmate? (used when the other side runs out of time)
export function canMate(b, col) {
  const mine = b.filter(p => p && colorOf(p) === col && p.toLowerCase() !== 'k');
  if (!mine.length) return false;
  if (mine.length === 1 && 'nb'.includes(mine[0].toLowerCase())) return false;
  return true;
}

// Replay a list of UCI moves from the start. Returns every position, the SAN list and the move objects.
export function replay(ucis) {
  const states = [initState()], sans = [], moves = [];
  for (const u of ucis || []) {
    const s = states[states.length - 1], L = legalMoves(s), m = uciToMove(s, u, L);
    if (!m) break;
    sans.push(toSAN(s, m, L)); moves.push(m); states.push(makeMove(s, m));
  }
  return { states, sans, moves };
}

// Is the game over in this final position? keys = posKey of every position so far.
export function gameEnd(s, keys) {
  const L = legalMoves(s);
  if (!L.length) return inCheck(s, s.turn)
    ? { result: s.turn === 'w' ? '0-1' : '1-0', reason: 'checkmate' }
    : { result: '1/2-1/2', reason: 'stalemate' };
  if (insufficient(s.board)) return { result: '1/2-1/2', reason: 'insufficient material' };
  if (s.half >= 100) return { result: '1/2-1/2', reason: '50-move rule' };
  const k = posKey(s);
  if (keys && keys.filter(x => x === k).length >= 3) return { result: '1/2-1/2', reason: 'repetition' };
  return null;
}
