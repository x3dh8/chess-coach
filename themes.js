// Works out what a winning idea is (fork, pin, skewer, discovered attack, mate patterns...) and explains it.
// Used to tag puzzles, give "idea" hints, and explain solutions and coach tips in plain English.
import * as R from './rules.js';
import { PV, PNAME, isSac } from './analysis.js';

export const THEMES = {
  mateIn1: { n: 'Mate in 1', ic: '♚', hint: 'There’s a checkmate in one move. Look at every check.' },
  mateIn2: { n: 'Mate in 2', ic: '♚', hint: 'You can force checkmate in two moves. Start with a forcing move.' },
  mateIn3: { n: 'Mate in 3+', ic: '♚', hint: 'There’s a forced checkmate. Keep giving checks that leave the king fewer squares.' },
  backRankMate: { n: 'Back-rank mate', ic: '🧱', hint: 'The enemy king is stuck behind its own pawns on the back rank.' },
  smotheredMate: { n: 'Smothered mate', ic: '🐴', hint: 'The king is boxed in by its own pieces. A knight can finish it.' },
  fork: { n: 'Fork', ic: '🍴', hint: 'Look for one move that attacks two things at once.' },
  pin: { n: 'Pin', ic: '📌', hint: 'Look for a piece that can’t move because something more valuable is behind it.' },
  skewer: { n: 'Skewer', ic: '🍢', hint: 'Attack a valuable piece that has something else lined up behind it.' },
  discoveredAttack: { n: 'Discovered attack', ic: '🔦', hint: 'Move one piece out of the way to unleash another piece behind it.' },
  doubleCheck: { n: 'Double check', ic: '⚡', hint: 'You can check with two pieces at once. The king has to move.' },
  hangingPiece: { n: 'Hanging piece', ic: '🎁', hint: 'Something of theirs is undefended. Find it and take it.' },
  sacrifice: { n: 'Sacrifice', ic: '💥', hint: 'Sometimes you have to give up material to win more. Look for a bold move.' },
  promotion: { n: 'Promotion', ic: '👑', hint: 'A pawn is close to becoming a queen. Help it get there.' },
  quietMove: { n: 'Quiet move', ic: '🤫', hint: 'The best move here isn’t a check or a capture. Look for a calm move that creates a threat.' },
  endgame: { n: 'Endgame', ic: '🏁', hint: 'Few pieces are left. Think about the king, the pawns and promotion.' },
  winMaterial: { n: 'Win material', ic: '💰', hint: 'There’s a way to win material here. Look at checks, captures and threats.' },
  advantage: { n: 'Advantage', ic: '📈', hint: 'Find the move that gives you the biggest advantage. Start with checks, captures and threats.' },
};
// Lessons: what each idea is, and how to spot it.
export const LESSONS = [
  ['hangingPiece', 'Every move, check if any of your opponent’s pieces are undefended or attacked by something cheaper. Beginners lose most games just by leaving pieces hanging, and taking them is the easiest way to win.', 'Before every move, ask: what can I take, and what is defending it?'],
  ['fork', 'A fork is one move that attacks two or more pieces at the same time. Your opponent can only save one of them, so you win the other. Knights are famous for forks, but any piece can do it, even a pawn.', 'Look for squares where one of your pieces would hit the king, queen or an undefended piece at the same time.'],
  ['pin', 'A pin attacks a piece that can’t move because a more valuable piece (often the king) is behind it. Pinned pieces are weak: you can attack them again and win them.', 'Look for enemy pieces lined up on the same line, diagonal or file as their king or queen.'],
  ['skewer', 'A skewer is the opposite of a pin: you attack a valuable piece first, it has to move, and you win the piece behind it.', 'When the king or queen is lined up with another piece, see if a bishop, rook or queen can attack them both down the line.'],
  ['discoveredAttack', 'A discovered attack happens when you move one piece and uncover an attack from another piece behind it. Now you have two threats at once. If the uncovered attack is a check, it’s even stronger.', 'Look for your bishops, rooks and queen that are blocked by your own piece. Moving that piece with a threat is often winning.'],
  ['doubleCheck', 'A double check gives check with two pieces at once. The only way out is to move the king, so it’s one of the strongest moves in chess.', 'Discovered checks where the moving piece also gives check are double checks.'],
  ['mateIn1', 'Checkmate ends the game. Always check every check: often one of them is mate.', 'Look at every check you have, and for each one ask: can the king escape, can the check be blocked, can the checking piece be taken?'],
  ['mateIn2', 'Mate in two means you play a forcing move, your opponent has to answer, then you deliver mate. The first move is often a check or a sacrifice.', 'Find the squares around their king. Which of your pieces can take those squares away?'],
  ['backRankMate', 'When a king is stuck on its back rank behind its own pawns, a rook or queen on that rank is checkmate.', 'If their king hasn’t made an escape square (like h6 or h3), look for a way to get a rook or queen to the back rank.'],
  ['smotheredMate', 'A smothered mate is when the king is completely surrounded by its own pieces, and a knight gives a check that can’t be blocked.', 'When the king is in the corner with its own pieces next to it, look for knight checks.'],
  ['sacrifice', 'A sacrifice gives up material on purpose to get something better: a checkmate, a bigger piece, or a winning attack.', 'If a normal move doesn’t work, ask: what if I just give this piece away? What would happen next?'],
  ['promotion', 'A pawn that reaches the last rank becomes a queen (or any piece). Pushing a passed pawn is often the fastest way to win.', 'Count how many moves the pawn needs, and check if anything can stop it.'],
  ['quietMove', 'Not every winning move is a check or capture. A quiet move can create a threat your opponent can’t stop.', 'If no check or capture works, look for a move that sets up an unstoppable threat.'],
  ['endgame', 'In the endgame the king becomes a strong piece, and pawns are worth more because they can promote.', 'Activate your king, push passed pawns, and trade pieces when you’re ahead.'],
];

// Squares a piece attacks (including ones with pieces on them)
export function attacksOf(b, sq) {
  const p = b[sq]; if (!p) return [];
  const t = p.toLowerCase(), w = p === p.toUpperCase(), r = sq >> 3, c = sq & 7, out = [];
  const add = (rr, cc) => { if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) out.push(rr * 8 + cc) };
  if (t === 'p') { add(r + (w ? -1 : 1), c - 1); add(r + (w ? -1 : 1), c + 1); return out }
  if (t === 'n') { for (const [a, d] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) add(r + a, c + d); return out }
  if (t === 'k') { for (let a = -1; a <= 1; a++) for (let d = -1; d <= 1; d++) if (a || d) add(r + a, c + d); return out }
  const dirs = [...(t !== 'r' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : []), ...(t !== 'b' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [])];
  for (const [a, d] of dirs) { let rr = r + a, cc = c + d; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { out.push(rr * 8 + cc); if (b[rr * 8 + cc]) break; rr += a; cc += d } }
  return out;
}
const val = p => p.toLowerCase() === 'k' ? 100 : PV[p.toLowerCase()];
const nm = p => PNAME[p.toLowerCase()];
const isMate = s => R.inCheck(s, s.turn) && !R.legalMoves(s).length;
const material = (b, col) => b.reduce((t, p) => t + (p && R.colorOf(p) === col && p.toLowerCase() !== 'k' ? PV[p.toLowerCase()] : 0), 0);

// What a single move does tactically. Returns [{theme, ...details}]
export function moveTactics(s, m) {
  const ns = R.makeMove(s, m), me = s.turn, op = R.other(me), out = [], b = ns.board, to = m.to, mover = b[to];
  const defended = (sq, by) => R.attacked(b, sq, by);
  // fork: the moved piece hits two valuable or loose things
  const hits = attacksOf(b, to).filter(q => b[q] && R.colorOf(b[q]) === op && b[q].toLowerCase() !== 'p' && (b[q].toLowerCase() === 'k' || val(b[q]) > val(mover) || !defended(q, op)));
  if (hits.length >= 2 && !(R.attacked(b, to, op) && !defended(to, me) && !hits.some(q => b[q].toLowerCase() === 'k'))) out.push({ theme: 'fork', sq: to, piece: mover, targets: hits.map(q => [q, b[q]]) });
  // pin / skewer from the moved piece
  if ('brq'.includes(mover.toLowerCase())) {
    const t = mover.toLowerCase(), dirs = [...(t !== 'r' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : []), ...(t !== 'b' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [])];
    for (const [a, d] of dirs) {
      let rr = (to >> 3) + a, cc = (to & 7) + d, first = null, second = null;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const q = rr * 8 + cc; if (b[q]) { if (!first) first = q; else { second = q; break } } rr += a; cc += d }
      if (first == null || second == null || R.colorOf(b[first]) !== op || R.colorOf(b[second]) !== op) continue;
      const A = b[first], B = b[second];
      if (B.toLowerCase() === 'k' || (val(B) > val(A) && val(B) > val(mover) - 1 && A.toLowerCase() !== 'k')) { if (A.toLowerCase() !== 'k') out.push({ theme: 'pin', sq: to, piece: mover, pinned: [first, A], behind: [second, B] }) }
      else if ((A.toLowerCase() === 'k' || val(A) > val(B)) && val(B) >= 3 && (!defended(second, op) || val(B) > val(mover))) out.push({ theme: 'skewer', sq: to, piece: mover, front: [first, A], behind: [second, B] });
    }
  }
  // discovered attack / check, double check
  const before = new Set(), after = [];
  for (let i = 0; i < 64; i++) { const p = s.board[i]; if (p && R.colorOf(p) === me && i !== m.from && 'brq'.includes(p.toLowerCase())) for (const q of attacksOf(s.board, i)) before.add(i * 64 + q) }
  for (let i = 0; i < 64; i++) { const p = b[i]; if (p && R.colorOf(p) === me && i !== to && 'brq'.includes(p.toLowerCase())) for (const q of attacksOf(b, i)) if (!before.has(i * 64 + q) && b[q] && R.colorOf(b[q]) === op && (b[q].toLowerCase() === 'k' || val(b[q]) >= 3)) after.push([i, q]) }
  if (after.length) out.push({ theme: 'discoveredAttack', by: [after[0][0], b[after[0][0]]], target: [after[0][1], b[after[0][1]]], check: after.some(([, q]) => b[q].toLowerCase() === 'k') });
  const k = R.findKing(b, op); let checkers = 0; for (let i = 0; i < 64; i++) if (b[i] && R.colorOf(b[i]) === me && attacksOf(b, i).includes(k)) checkers++;
  if (checkers >= 2) out.push({ theme: 'doubleCheck' });
  if (m.captured && !R.attacked(s.board, m.to, op) && val(m.captured) >= 3) out.push({ theme: 'hangingPiece', piece: m.captured, sq: m.to });
  if (m.promo) out.push({ theme: 'promotion' });
  if (isSac(s, m, ns)) out.push({ theme: 'sacrifice', piece: mover });
  return out;
}

// Tag a whole puzzle (solver moves are moves[0], [2], ...)
export function puzzleThemes(fen, moves) {
  let s = R.fromFEN(fen); const me = s.turn, op = R.other(me), first = s, t = new Set(), notes = [];
  const m0 = R.uciToMove(s, moves[0]);
  const mat0 = material(s.board, me) - material(s.board, op);
  for (let i = 0; i < moves.length; i++) {
    const m = R.uciToMove(s, moves[i]); if (!m) break;
    if (i % 2 === 0) for (const x of moveTactics(s, m)) { if (!t.has(x.theme)) notes.push({ ...x, ply: i, san: R.toSAN(s, m) }); t.add(x.theme) }
    s = R.makeMove(s, m);
  }
  if (isMate(s)) {
    const n = Math.ceil(moves.length / 2); t.add(n === 1 ? 'mateIn1' : n === 2 ? 'mateIn2' : 'mateIn3');
    const k = R.findKing(s.board, op), kr = k >> 3, last = R.uciToMove(R.fromFEN(fen), moves[0]) && s.board;
    const lastTo = R.sqIndex(moves[moves.length - 1].slice(2, 4)), lp = s.board[lastTo];
    if ((kr === 0 || kr === 7) && lp && 'rq'.includes(lp.toLowerCase()) && (lastTo >> 3) === kr) t.add('backRankMate');
    if (lp && lp.toLowerCase() === 'n' && attacksOf(s.board, k).filter(q => q !== lastTo).every(q => s.board[q] && R.colorOf(s.board[q]) === op)) t.add('smotheredMate');
    t.delete('winMaterial');
  } else {
    const gain = material(s.board, me) - material(s.board, op) - mat0;
    if (gain >= 2) t.add('winMaterial');
  }
  if (m0 && !m0.captured && !R.inCheck(R.makeMove(first, m0), op) && !isMate(R.makeMove(first, m0))) t.add('quietMove');
  if (first.board.filter(p => p && !'kKpP'.includes(p)).length <= 4) t.add('endgame');
  if (t.has('doubleCheck')) t.delete('discoveredAttack');
  if (!t.size || (t.size === 1 && t.has('endgame'))) t.add('advantage');
  return { themes: [...t], notes };
}

// A sentence or two on why the solution works
const PRIO = ['doubleCheck', 'fork', 'skewer', 'pin', 'discoveredAttack', 'promotion', 'sacrifice', 'hangingPiece'];
function clause(n, theirs) {
  switch (n.theme) {
    case 'fork': return `a fork: your ${nm(n.piece)} attacks ${n.targets.slice(0, 2).map(([, p]) => theirs(p)).join(' and ')} at the same time, and they can only save one`;
    case 'pin': return `a pin: ${theirs(n.pinned[1])} is stuck in front of ${theirs(n.behind[1])}${n.behind[1].toLowerCase() === 'k' ? ' and can’t legally move' : ''}`;
    case 'skewer': return `a skewer: it attacks ${theirs(n.front[1])}, and when that moves you win ${theirs(n.behind[1])} behind it`;
    case 'discoveredAttack': return `a discovered ${n.check ? 'check' : 'attack'}: moving that piece opens up your ${nm(n.by[1])} to hit ${theirs(n.target[1])}`;
    case 'doubleCheck': return 'a double check: two pieces give check at once, so the king has to move';
    case 'promotion': return 'a promotion: the pawn gets through and becomes a queen';
    case 'sacrifice': return `a sacrifice: you give up your ${nm(n.piece)}, but taking it costs them even more`;
  }
  return '';
}
export function explain(fen, moves) {
  const { themes, notes } = puzzleThemes(fen, moves), s0 = R.fromFEN(fen), first = R.uciToMove(s0, moves[0]), san = first ? R.toSAN(s0, first) : moves[0];
  const theirs = p => `their ${nm(p)}`, op = R.other(s0.turn);
  const mate = themes.find(x => x.startsWith('mateIn'));
  if (mate) {
    const k = themes.includes('backRankMate') ? ' The king is trapped on the back rank by its own pawns.' : themes.includes('smotheredMate') ? ' The king is smothered by its own pieces, so the knight check can’t be stopped.' : '';
    const sac = notes.find(x => x.theme === 'sacrifice' && x.ply === 0) ? ' It starts with a sacrifice: grabbing the piece doesn’t save them.' : '';
    return moves.length === 1 ? `${san} is checkmate!${k}` : `${san} starts a forced checkmate in ${Math.ceil(moves.length / 2)}.${sac}${k}`;
  }
  const n = PRIO.map(t => notes.find(x => x.theme === t && x.ply === 0) || notes.find(x => x.theme === t)).find(x => x && x.theme !== 'hangingPiece');
  let out = '';
  if (first && first.captured && val(first.captured) >= 3) {
    const free = !R.attacked(s0.board, first.to, op), ck = R.inCheck(R.makeMove(s0, first), op);
    out = `${san} wins ${theirs(first.captured)}${ck ? ' with check' : ''}${free ? ', and it wasn’t even defended' : ''}.`;
    if (n) out += ` It’s also ${clause(n, theirs)}.`;
    return out;
  }
  if (n) return `${n.ply === 0 ? san : n.san} is ${clause(n, theirs)}.`;
  const h = notes.find(x => x.theme === 'hangingPiece');
  if (h) return `${h.ply === 0 ? san : `After ${san}, ${h.san}`} wins ${theirs(h.piece)} for free.`;
  if (themes.includes('quietMove')) return `${san} is a quiet move that creates a threat they can’t stop${themes.includes('winMaterial') ? ', so you win material' : ''}.`;
  return themes.includes('winMaterial') ? `${san} wins material. Every reply loses something.` : `${san} is the strongest move here.`;
}
export function ideaHint(fen, moves) {
  const { themes } = puzzleThemes(fen, moves);
  const order = ['mateIn1', 'backRankMate', 'smotheredMate', 'mateIn2', 'mateIn3', 'doubleCheck', 'fork', 'skewer', 'pin', 'discoveredAttack', 'hangingPiece', 'promotion', 'sacrifice', 'quietMove', 'winMaterial', 'endgame'];
  const t = order.find(x => themes.includes(x));
  return t ? THEMES[t].hint : 'Look at every check, capture and threat.';
}
