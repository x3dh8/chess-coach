// Computer opponents. Every bot uses Stockfish, then picks a move the way its personality would.
import * as R from './rules.js';
import { analyse } from './engine.js';
import { PV, hanging } from './analysis.js';

// style: aggressive | defensive | gambit | trader | pawns | knights | bishops | queen | king | solid | chaos | tactical | positional
export const BOTS = [
  { id: 'pip', name: 'Pip', emoji: '🐣', rating: 250, color: '#f6c445', style: 'chaos', tag: 'Just learned how the pieces move.', rep: ['e4 e5 Qh5', 'a4', 'h4'],
    say: { hi: ['Hi!! Which one is the horsey?', 'I like the pointy hat piece!'], good: ['Ooh, nice!'], oops: ['Wait, can you do that?'], win: ['I WON?! 🎉'], lose: ['Good game! You are so good!'], take: ['Yoink!'] } },
  { id: 'rusty', name: 'Rusty', emoji: '🤖', rating: 400, color: '#b0755b', style: 'aggressive', tag: 'Attacks everything. Thinks very little.', rep: ['e4 e5 Qh5 Nc6 Bc4'],
    say: { hi: ['BEEP. ATTACK MODE ON.'], good: ['ERROR: DID NOT SEE THAT.'], oops: ['RECALCULATING...'], win: ['VICTORY.EXE'], lose: ['SHUTTING DOWN. GG.'], take: ['CAPTURED.'] } },
  { id: 'daisy', name: 'Daisy', emoji: '🌼', rating: 550, color: '#e8a0c0', style: 'solid', tag: 'Plays it safe. Loves to castle early.', rep: ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'd4 d5 e3'],
    say: { hi: ['Hello! Let’s have a nice game.'], good: ['Oh, well played!'], oops: ['Oopsie.'], win: ['That was fun!'], lose: ['You played lovely.'], take: ['Sorry!'] } },
  { id: 'brick', name: 'Brick', emoji: '🧱', rating: 700, color: '#a5533b', style: 'defensive', tag: 'Builds walls of pawns and waits.', rep: ['d4 d5 e3 Nf6 Bd3', 'e4 c6 d4 d5'],
    say: { hi: ['You will not get through.'], good: ['A crack in the wall...'], oops: ['Hmm.'], win: ['The wall holds.'], lose: ['The wall has fallen.'], take: ['Mine.'] } },
  { id: 'zip', name: 'Zip', emoji: '⚡', rating: 850, color: '#4fb3ff', style: 'aggressive', tag: 'Moves fast, attacks your king.', rep: ['e4 e5 f4', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5'],
    say: { hi: ['Let’s go go go!'], good: ['Whoa, fast hands!'], oops: ['Too fast, too fast!'], win: ['Speed wins!'], lose: ['You out-zipped me.'], take: ['Zap!'] } },
  { id: 'olive', name: 'Olive', emoji: '🫒', rating: 1000, color: '#7a8f3c', style: 'positional', tag: 'Slow plans, good pieces.', rep: ['d4 Nf6 c4 e6', 'c4 e5 Nc3'],
    say: { hi: ['Patience is a weapon.'], good: ['A thoughtful move.'], oops: ['That was careless of me.'], win: ['Slow and steady.'], lose: ['Very nicely done.'], take: ['Thank you.'] } },
  { id: 'gambito', name: 'Gambito', emoji: '🎩', rating: 1100, color: '#8e44ad', style: 'gambit', tag: 'Gives up pawns for a wild attack.', rep: ['e4 e5 f4', 'd4 d5 e4', 'e4 c5 d4 cxd4 c3', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4', 'e4 e5 d4 exd4 c3'],
    say: { hi: ['A pawn? Take it. I insist.'], good: ['Bold! I like you.'], oops: ['A gambit too far...'], win: ['Fortune favors the bold!'], lose: ['Bravo! You survived my storm.'], take: ['Ha-ha!'] } },
  { id: 'knightro', name: 'Knightro', emoji: '🐴', rating: 1200, color: '#5d6d7e', style: 'knights', tag: 'Loves knights. Hops everywhere.', rep: ['Nf3 Nf6 Nc3', 'e4 e5 Nf3 Nc6 Nc3 Nf6'],
    say: { hi: ['Neigh! Ready to hop?'], good: ['Neigh-ice move.'], oops: ['Whoa there.'], win: ['Hoof-ray!'], lose: ['Good gallop.'], take: ['Clip-clop, gotcha.'] } },
  { id: 'bishopbea', name: 'Bea', emoji: '🐝', rating: 1300, color: '#e0b100', style: 'bishops', tag: 'Long diagonal sniper.', rep: ['g3 d5 Bg2', 'b3 e5 Bb2', 'e4 g6 d4 Bg7'],
    say: { hi: ['Bzzz. Watch the diagonals.'], good: ['Sharp sting!'], oops: ['Bzz... missed that.'], win: ['Sweet as honey.'], lose: ['You out-buzzed me.'], take: ['Sting!'] } },
  { id: 'pawnstorm', name: 'Stormy', emoji: '🌩️', rating: 1400, color: '#4b6584', style: 'pawns', tag: 'Pushes pawns at your king.', rep: ['e4 c5 Nc3 Nc6 f4', 'd4 f5'],
    say: { hi: ['A storm is coming.'], good: ['You weathered that.'], oops: ['The storm blew over.'], win: ['Thunder!'], lose: ['Clear skies for you.'], take: ['Crash!'] } },
  { id: 'trader', name: 'Swap', emoji: '🔄', rating: 1500, color: '#16a085', style: 'trader', tag: 'Trades everything, wins endgames.', rep: ['e4 e5 Nf3 Nf6', 'd4 d5 c4 dxc4'],
    say: { hi: ['Let’s simplify.'], good: ['Clean.'], oops: ['Bad trade.'], win: ['Endgames are my thing.'], lose: ['Fair trade.'], take: ['Trade?'] } },
  { id: 'queenie', name: 'Queenie', emoji: '👑', rating: 1600, color: '#c0392b', style: 'queen', tag: 'Brings her queen out to play.', rep: ['e4 d5 exd5 Qxd5', 'e4 e5 Nf3 Nc6 Bc4 Nf6'],
    say: { hi: ['My queen is ready.'], good: ['How royal of you.'], oops: ['Unbecoming.'], win: ['Long live the queen.'], lose: ['I bow to you.'], take: ['Off with its head!'] } },
  { id: 'professor', name: 'Professor Hoot', emoji: '🦉', rating: 1700, color: '#795548', style: 'positional', tag: 'Plays by the book. Very classical.', rep: ['e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', 'd4 d5 c4 e6 Nc3 Nf6 Bg5'],
    say: { hi: ['Shall we begin the lesson?'], good: ['Textbook!'], oops: ['Even owls make errors.'], win: ['Class dismissed.'], lose: ['Top marks!'], take: ['Hoo hoo.'] } },
  { id: 'viper', name: 'Viper', emoji: '🐍', rating: 1800, color: '#27ae60', style: 'tactical', tag: 'Sets traps. Strikes fast.', rep: ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', 'd4 Nf6 c4 c5 d5 b5'],
    say: { hi: ['Ssss... watch your step.'], good: ['You dodged my fangs.'], oops: ['Hiss!'], win: ['Venom wins.'], lose: ['You charmed the snake.'], take: ['Bite.'] } },
  { id: 'fortress', name: 'Fortress', emoji: '🏰', rating: 1900, color: '#7f8c8d', style: 'defensive', tag: 'Almost impossible to break.', rep: ['e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5', 'd4 d5 c4 c6'],
    say: { hi: ['Knock if you dare.'], good: ['A strong blow.'], oops: ['A gate was open.'], win: ['Unbreakable.'], lose: ['The fortress falls.'], take: ['Repelled.'] } },
  { id: 'blaze', name: 'Blaze', emoji: '🔥', rating: 2000, color: '#e67e22', style: 'aggressive', tag: 'All-out attack every game.', rep: ['e4 e5 Nf3 Nc6 Bc4 Bc5 b4', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5'],
    say: { hi: ['Let’s burn it down.'], good: ['Hot move!'], oops: ['Ouch, that burned me.'], win: ['Up in flames!'], lose: ['You put out my fire.'], take: ['Burn!'] } },
  { id: 'frost', name: 'Frost', emoji: '❄️', rating: 2200, color: '#74b9ff', style: 'solid', tag: 'Cold, calm, accurate.', rep: ['d4 Nf6 c4 e6 Nf3 d5', 'Nf3 d5 g3'],
    say: { hi: ['Stay cool.'], good: ['Ice cold.'], oops: ['A crack in the ice.'], win: ['Frozen.'], lose: ['You melted me.'], take: ['Chill.'] } },
  { id: 'machine', name: 'The Machine', emoji: '🦾', rating: 2400, color: '#34495e', style: 'positional', tag: 'Grinds out tiny advantages.', rep: ['e4 e5 Nf3 Nc6 Bb5 Nf6', 'd4 Nf6 c4 e6 g3'],
    say: { hi: ['Let’s play.'], good: ['Good move.'], oops: ['Inaccurate.'], win: ['GG.'], lose: ['Well played. Impressive.'], take: ['Noted.'] } },
  { id: 'gm_ghost', name: 'Ghost GM', emoji: '👻', rating: 2600, color: '#95a5a6', style: 'tactical', tag: 'Grandmaster strength. Boo.', rep: ['e4 c5 Nf3 Nc6 Bb5', 'd4 d5 c4 e6 Nc3 Nf6'],
    say: { hi: ['Boooo... let’s play.'], good: ['Spooky good.'], oops: ['I must be haunted.'], win: ['Boo-yah.'], lose: ['You busted the ghost!'], take: ['Gone!'] } },
  { id: 'titan', name: 'Titan', emoji: '🗿', rating: 2850, color: '#5f4b8b', style: 'positional', tag: 'World-champion level.', rep: [],
    say: { hi: ['...'], good: ['Hm.'], oops: ['...'], win: ['As expected.'], lose: ['Remarkable.'], take: ['.'] } },
  { id: 'max', name: 'Stockfish Max', emoji: '🐟', rating: 3200, color: '#1e272e', style: 'max', tag: 'Full strength. Good luck.', rep: [],
    say: { hi: ['Full power.'], good: ['Interesting.'], oops: [''], win: ['Checkmate is inevitable.'], lose: ['...how?'], take: [''] } },
];
// Coaches play like a bot of the level you pick, but talk you through the game.
export const COACHES = [
  { id: 'coach_sam', name: 'Coach Sam', emoji: '🧢', color: '#2e86de', tag: 'Friendly and patient. Great for learning basics.' },
  { id: 'coach_maya', name: 'Coach Maya', emoji: '🎓', color: '#8e44ad', tag: 'Explains plans and ideas. Great for getting better.' },
  { id: 'coach_rex', name: 'Coach Rex', emoji: '🦖', color: '#27ae60', tag: 'Tough love. Tells it like it is.' },
];
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
  if (bot.style === 'max' || rating >= 3000) { const r = await analyse(fen, { movetime: 1500, tag: 'bot' }); return { uci: r.best || R.moveToUci(L[0]) } }
  if (rating >= 2000) { const r = await analyse(fen, { movetime: 900, elo: rating, tag: 'bot' }); return { uci: r.best || R.moveToUci(L[0]) } }
  const p = params(rating);
  if (Math.random() < p.random) { // a "human" slip: a random move that isn't a total disaster for weak bots
    const safe = L.filter(m => !hanging(R.makeMove(s, m).board, s.turn, 5).length);
    const pool = rating < 500 ? L : (safe.length ? safe : L);
    return { uci: R.moveToUci(pool[Math.floor(Math.random() * pool.length)]) };
  }
  const r = await analyse(fen, { depth: p.depth, multipv: Math.min(p.multipv, L.length), tag: 'bot' });
  if (!r.lines.length) return { uci: r.best || R.moveToUci(L[0]) };
  const top = r.lines[0].cp;
  // never miss mate in 1 above beginner level
  if (rating >= 600 && r.lines[0].mate === 1) return { uci: r.lines[0].uci };
  const scored = r.lines.map(l => { const m = R.uciToMove(s, l.uci, L); return { l, w: Math.exp(-Math.max(0, top - Math.min(l.cp, top + 300) - (m ? styleBonus(bot.style, s, m) : 0)) / p.temp) } });
  let tot = scored.reduce((a, x) => a + x.w, 0), x = Math.random() * tot;
  for (const sc of scored) { x -= sc.w; if (x <= 0) return { uci: sc.l.uci, eval: sc.l.cp } }
  return { uci: r.lines[0].uci, eval: top };
}
