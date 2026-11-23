// Puzzles: rated puzzles, Puzzle Rush, Daily Puzzle, and puzzles from your own mistakes.
import * as R from './rules.js';
import { PUZZLES } from './puzzles-data.js';
import * as A from './analysis.js';
import * as snd from './sound.js';

const THEME = { capture: 'Win material', check: 'Check', fork: 'Fork', quiet: 'Quiet move', mate: 'Checkmate', promotion: 'Promotion' };
export function puzzleView(ctx, mode) {
  const { D, save, $, esc, top, bindGo, app, newBoard } = ctx;
  let P = null, s = null, step = 0, failed = false, done = false, alive = true, hinted = false, last = null, busy = false;
  // rush state
  const rush = mode === 'rush' ? { score: 0, strikes: 0, end: 0, running: false, seen: new Set() } : null;
  let rushT = null;
  const title = { rated: '🧩 Puzzles', rush: '⚡ Puzzle Rush', daily: '📅 Daily Puzzle', mistakes: '🎯 Your Mistakes' }[mode];
  app.innerHTML = `${top(title)}<div class="game"><div class="gcol"><div class="pbar" id="pinfo"></div><div class="gboard"><div id="bd"></div></div></div>
    <div class="side"><div id="ptop"></div><div class="bubble" id="pmsg"></div><div class="ctrl" id="pctrl"></div></div></div>`;
  bindGo();
  const board = newBoard($('#bd'));
  // ----- picking puzzles -----
  function mistakePuzzles() {
    const out = [];
    for (const g of D.games) if (g.review && g.review.mist) for (const m of g.review.mist) {
      const gd = ctx.gameData(g.moves.slice(0, m.ply)); const st = gd.states[gd.states.length - 1];
      out.push({ id: g.id + ':' + m.ply, fen: R.toFEN(st), moves: [m.best], themes: [], rating: null, from: g, ply: m.ply, any: true });
    }
    return out;
  }
  function choose() {
    if (mode === 'daily') { const day = Math.floor(Date.now() / 864e5), pool = PUZZLES.filter(p => p.rating >= 1100 && p.rating <= 1900); return pool[day % pool.length] }
    if (mode === 'mistakes') { const all = mistakePuzzles().filter(p => D.solved[p.id] !== 1); return all.length ? all[Math.floor(Math.random() * all.length)] : null }
    if (mode === 'rush') { const want = 450 + rush.score * 75; const pool = PUZZLES.filter(p => !rush.seen.has(p.id) && Math.abs(p.rating - want) < 160); const list = pool.length ? pool : PUZZLES.filter(p => !rush.seen.has(p.id)); return list[Math.floor(Math.random() * list.length)] }
    for (let w = 120; w < 3000; w *= 2) { const pool = PUZZLES.filter(p => D.solved[p.id] == null && Math.abs(p.rating - D.puzRating) <= w); if (pool.length) return pool[Math.floor(Math.random() * pool.length)] }
    return PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  }
  function load(p) {
    P = p; failed = false; done = false; hinted = false; step = 0; busy = false;
    if (!P) { $('#pmsg').innerHTML = `<div class="txt">${mode === 'mistakes' ? 'No mistakes to practice yet. After a game, open <b>Game Review</b> and let it finish. Your mistakes show up here as puzzles.' : 'No puzzles left!'}</div>`; $('#pctrl').innerHTML = ''; return }
    if (rush) rush.seen.add(P.id);
    s = R.fromFEN(P.fen); last = null;
    board.flip(s.turn); board.setArrows([]); board.setHighlights({}); board.setBadges([]);
    board.setPosition(s, { animate: false });
    board.setInteractive(s.turn, onMove);
    draw(`${s.turn === 'w' ? 'White' : 'Black'} to move. ${P.mate ? `Find mate in ${P.mate}.` : P.any ? 'You made a mistake here in a real game. Find the best move.' : 'Find the best move.'}`);
  }
  function draw(msg, cls) {
    const col = s ? s.turn === 'w' ? '#fff' : '#333' : '#fff';
    $('#pinfo').innerHTML = `<div class="pzturn"><i style="background:${P && R.fromFEN(P.fen).turn === 'w' ? '#fff' : '#111'}"></i>${P ? (R.fromFEN(P.fen).turn === 'w' ? 'White' : 'Black') + ' to move' : ''}</div>`;
    if (rush) {
      const left = rush.running ? Math.max(0, rush.end - Date.now()) : 180000;
      $('#ptop').innerHTML = `<div class="card rush"><div><div class="dim" style="font-size:.8rem">Score</div><div class="sc">${rush.score}</div></div><div class="clock ${rush.running ? 'run' : ''} ${left < 20000 ? 'low' : ''}" id="rclk">${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}</div><div class="strikes">${[0, 1, 2].map(k => `<i class="${k < rush.strikes ? 'x' : ''}">${k < rush.strikes ? '✕' : ''}</i>`).join('')}</div></div>`;
    } else $('#ptop').innerHTML = `<div class="card pzinfo"><div style="flex:1"><b>${mode === 'rated' ? `Your puzzle rating: ${D.puzRating}` : mode === 'daily' ? new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : 'From your games'}</b><div>${P && P.themes ? P.themes.map(t => `<span class="tag">${THEME[t] || t}</span>`).join('') : ''}${P && P.rating && (done || failed) ? `<span class="tag">Puzzle ${P.rating}</span>` : ''}</div></div></div>`;
    $('#pmsg').className = 'bubble';
    $('#pmsg').innerHTML = `<span class="av" style="background:${cls === 'ok' ? '#5d8c32' : cls === 'bad' ? '#c9402b' : '#5c8bb0'}">${cls === 'ok' ? '✅' : cls === 'bad' ? '❌' : '🧩'}</span><div class="txt">${msg}</div>`;
    const b = [];
    if (!rush) {
      if (!done && !failed) b.push(['hint', '💡', 'Hint'], ['sol', '👀', 'Solution']);
      if (failed && !done) b.push(['retry', '↩️', 'Try again'], ['sol', '👀', 'Solution']);
      if (done || failed) b.push(['next', '▶️', 'Next puzzle']);
      if (mode === 'daily' && (done || failed)) b.splice(b.findIndex(x => x[0] === 'next'), 1, ['more', '🧩', 'More puzzles']);
    } else if (!rush.running) b.push(['go', '⚡', rush.strikes >= 3 || rush.over ? 'Play again' : 'Start']);
    $('#pctrl').innerHTML = b.map(([k, i, l]) => `<button data-p="${k}"><i>${i}</i>${l}</button>`).join('');
    $('#pctrl').querySelectorAll('[data-p]').forEach(x => x.onclick = () => act(x.dataset.p));
  }
  function resultRating(win) {
    if (mode !== 'rated' || P.rating == null || D.solved[P.id] != null) return '';
    const exp = 1 / (1 + 10 ** ((P.rating - D.puzRating) / 400)), K = Object.keys(D.solved).length < 30 ? 32 : 16, delta = Math.round(K * ((win ? 1 : 0) - exp));
    D.puzRating = Math.max(100, D.puzRating + delta); D.puzHist.push([Date.now(), D.puzRating]); D.puzHist = D.puzHist.slice(-500);
    return ` <b style="color:${delta >= 0 ? 'var(--acc)' : 'var(--bad)'}">${delta >= 0 ? '+' : ''}${delta}</b>`;
  }
  function onMove(m) {
    if (busy || done) return;
    const want = P.moves[step], uci = R.moveToUci(m), ns = R.makeMove(s, m);
    const mates = R.inCheck(ns, ns.turn) && !R.legalMoves(ns).length;
    const L = R.legalMoves(s);
    snd.play(R.inCheck(ns, ns.turn) ? 'check' : m.captured ? 'capture' : 'move');
    if (uci === want || mates || (P.any && uci === want)) {
      s = ns; last = m; step++;
      board.setPosition(s, { animate: true, last: m });
      if (step >= P.moves.length || mates) return solved();
      busy = true; board.setInteractive(null);
      draw('✓ Correct! Keep going…', 'ok');
      setTimeout(() => {
        if (!alive) return;
        const rm = R.uciToMove(s, P.moves[step]); const n2 = R.makeMove(s, rm);
        snd.play(R.inCheck(n2, n2.turn) ? 'check' : rm.captured ? 'capture' : 'move');
        s = n2; last = rm; step++; busy = false;
        board.setPosition(s, { animate: true, last: rm }); board.setInteractive(s.turn, onMove);
        draw('Your move again.', 'ok');
      }, 450);
      return;
    }
    // wrong move: show it, then put it back
    const shown = ns; board.setPosition(shown, { animate: true, last: m }); board.setInteractive(null);
    snd.play('bad');
    if (rush) { rush.strikes++; draw(`❌ Not that one.${rush.strikes >= 3 ? '' : ' Next puzzle!'}`, 'bad'); setTimeout(() => { if (!alive) return; if (rush.strikes >= 3) endRush(); else load(choose()) }, 900); return }
    if (!failed) { failed = true; const rr = resultRating(false); if (P.rating != null && D.solved[P.id] == null) D.solved[P.id] = 0; save(); draw(`That's not it.${rr ? ` Rating${rr}` : ''} ${A.hanging(ns.board, R.other(ns.turn)).length ? '' : ''}Try again, or see the solution.`, 'bad') }
    else draw('Still not it. Try again, or look at the solution.', 'bad');
    setTimeout(() => { if (!alive || done) return; board.setPosition(s, { animate: true, last }); board.setInteractive(s.turn, onMove) }, 700);
  }
  function solved() {
    done = true; board.setInteractive(null); snd.play('good');
    if (rush) { rush.score++; draw('✅ Solved!', 'ok'); setTimeout(() => alive && load(choose()), 500); return }
    let rr = '';
    if (!failed) { rr = hinted ? '' : resultRating(true); D.solved[P.id] = 1 } else if (P.any) D.solved[P.id] = 1;
    if (mode === 'daily') D.daily[new Date().toISOString().slice(0, 10)] = 1;
    save();
    draw(`${failed ? 'Got it this time!' : hinted ? 'Solved with a hint.' : 'Correct! 🎉'}${rr ? ` Rating${rr}` : ''}`, 'ok');
  }
  function act(k) {
    if (k === 'next') return load(choose());
    if (k === 'more') return ctx.go('puzzles', 'rated');
    if (k === 'retry') { draw('Try again. You can do it!'); return }
    if (k === 'hint') { hinted = true; const m = R.uciToMove(s, P.moves[step]); if (m) board.setHighlights({ [m.from]: 'hint' }); draw(`💡 Look at your <b>${A.PNAME[m.piece.toLowerCase()]}</b>.`); return }
    if (k === 'sol') {
      if (!failed && !done) { failed = true; resultRating(false); if (P.rating != null) D.solved[P.id] = 0; save() }
      busy = true; board.setInteractive(null);
      const playOut = () => {
        if (!alive || step >= P.moves.length) { busy = false; done = true; draw(`Here's the solution. ${P.moves.length > 1 ? '' : ''}Study it, then try the next one.`); return }
        const m = R.uciToMove(s, P.moves[step]); if (!m) { busy = false; done = true; draw('Here’s the solution.'); return }
        board.setArrows([{ from: m.from, to: m.to, color: 'g' }]);
        setTimeout(() => { if (!alive) return; s = R.makeMove(s, m); last = m; step++; snd.play(m.captured ? 'capture' : 'move'); board.setPosition(s, { animate: true, last: m }); board.setArrows([]); setTimeout(playOut, 500) }, 700);
      };
      playOut(); return;
    }
    if (k === 'go') startRush();
  }
  function startRush() {
    Object.assign(rush, { score: 0, strikes: 0, end: Date.now() + 180000, running: true, over: false, seen: new Set() });
    snd.play('start'); load(choose());
    clearInterval(rushT); rushT = setInterval(() => { if (!rush.running) return; const left = rush.end - Date.now(); const c = $('#rclk'); if (c) { c.textContent = `${Math.floor(Math.max(0, left) / 60000)}:${String(Math.floor(Math.max(0, left) / 1000) % 60).padStart(2, '0')}`; c.classList.toggle('low', left < 20000) } if (left <= 0) endRush() }, 250);
  }
  function endRush() {
    if (!rush.running) return; rush.running = false; rush.over = true; clearInterval(rushT); board.setInteractive(null);
    const best = rush.score > (D.rushBest || 0); if (best) { D.rushBest = rush.score; save() }
    snd.play(best ? 'win' : 'draw');
    draw(`⏱ Time! You scored <b>${rush.score}</b>.${best ? ' 🏆 New personal best!' : ` Your best is ${D.rushBest}.`}`, best ? 'ok' : '');
  }
  if (rush) { s = R.initState(); P = null; board.setPosition(s, { animate: false }); draw(`Solve as many puzzles as you can in 3 minutes. They get harder as you go. 3 wrong answers and you're out!${D.rushBest ? ` Your best: <b>${D.rushBest}</b>.` : ''}`) }
  else load(choose());
  return () => { alive = false; clearInterval(rushT) };
}
