// Puzzles: rated puzzles, themes and lessons, Puzzle Rush, Daily Puzzle, and puzzles from your own mistakes.
// A coach (Maya) talks you through each one: idea hints, why the answer works, and why a wrong move fails.
import * as R from './rules.js';
import { PUZZLES } from './puzzles-data.js';
import * as A from './analysis.js';
import * as snd from './sound.js';
import * as voice from './voice.js';
import { analyse, clearQueue } from './engine.js';
import { THEMES, LESSONS, explain, ideaHint, puzzleThemes } from './themes.js';
import { COACH_PEOPLE } from './people.js';
import { faceSVG } from './faces.js';

const COACH = { ...COACH_PEOPLE[1], color: COACH_PEOPLE[1].face.bg };
const SHOWN = ['mateIn1', 'mateIn2', 'mateIn3', 'backRankMate', 'smotheredMate', 'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'hangingPiece', 'sacrifice', 'promotion', 'quietMove', 'endgame', 'winMaterial', 'advantage'];
const tagHTML = t => THEMES[t] ? `<span class="tag">${THEMES[t].ic} ${THEMES[t].n}</span>` : '';
const countFor = t => PUZZLES.filter(p => p.themes.includes(t)).length;

export function puzzleView(ctx, mode) {
  const { D, save, $, esc, top, bindGo, app, newBoard } = ctx;
  const theme = mode.startsWith('theme:') ? mode.slice(6) : null;
  D.themeDone = D.themeDone || {};
  let P = null, s = null, step = 0, failed = false, done = false, alive = true, hintStep = 0, last = null, busy = false, why = 0;
  const rush = mode === 'rush' ? { score: 0, strikes: 0, end: 0, running: false, seen: new Set() } : null;
  let rushT = null;
  const title = theme ? `${THEMES[theme].ic} ${THEMES[theme].n}` : { rated: '🧩 Puzzles', rush: '⚡ Puzzle Rush', daily: '📅 Daily Puzzle', mistakes: '🎯 Your Mistakes' }[mode];
  app.innerHTML = `${top(title, theme ? 'learn' : 'home')}<div class="game"><div class="gcol"><div class="pbar" id="pinfo"></div><div class="gboard"><div id="bd"></div></div></div>
    <div class="side"><div id="ptop"></div><div id="pmsg"></div><div class="ctrl" id="pctrl"></div>${mode === 'rated' ? `<div id="pthemes"></div>` : ''}</div></div>`;
  bindGo();
  const board = newBoard($('#bd'));
  const talk = (t, speak = true) => { if (speak && !rush) voice.say(t, COACH) };
  // ----- picking puzzles -----
  function mistakePuzzles() {
    const out = [];
    for (const g of D.games) if (g.review && g.review.mist) for (const m of g.review.mist) {
      const gd = ctx.gameData(g.moves.slice(0, m.ply)); const st = gd.states[gd.states.length - 1];
      out.push({ id: g.id + ':' + m.ply, fen: R.toFEN(st), moves: [m.best], themes: null, rating: null, from: g, ply: m.ply, any: true });
    }
    return out;
  }
  function choose() {
    if (mode === 'daily') { const day = Math.floor(Date.now() / 864e5), pool = PUZZLES.filter(p => p.rating >= 1100 && p.rating <= 1900); return pool[day % pool.length] }
    if (mode === 'mistakes') { const all = mistakePuzzles().filter(p => D.solved[p.id] !== 1); return all.length ? all[Math.floor(Math.random() * all.length)] : null }
    if (mode === 'rush') { const want = 450 + rush.score * 75; const pool = PUZZLES.filter(p => !rush.seen.has(p.id) && Math.abs(p.rating - want) < 160); const list = pool.length ? pool : PUZZLES.filter(p => !rush.seen.has(p.id)); return list[Math.floor(Math.random() * list.length)] }
    if (theme) { // easiest unsolved first, close to your level
      const done = D.themeDone[theme] || {}, pool = PUZZLES.filter(p => p.themes.includes(theme));
      const left = pool.filter(p => !done[p.id]).sort((a, b) => Math.abs(a.rating - D.puzRating + 150) - Math.abs(b.rating - D.puzRating + 150));
      const list = left.length ? left.slice(0, 6) : pool; return list[Math.floor(Math.random() * list.length)];
    }
    for (let w = 120; w < 3000; w *= 2) { const pool = PUZZLES.filter(p => D.solved[p.id] == null && Math.abs(p.rating - D.puzRating) <= w); if (pool.length) return pool[Math.floor(Math.random() * pool.length)] }
    return PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  }
  function load(p) {
    P = p; failed = false; done = false; hintStep = 0; step = 0; busy = false; why++;
    if (!P) { msg(mode === 'mistakes' ? 'No mistakes to practice yet. After a game, open <b>Game Review</b> and let it finish. Your mistakes show up here as puzzles.' : 'No puzzles left!'); $('#pctrl').innerHTML = ''; return }
    if (P.themes == null) P.themes = puzzleThemes(P.fen, P.moves).themes;
    if (rush) rush.seen.add(P.id);
    s = R.fromFEN(P.fen); last = null;
    board.flip(s.turn); board.setArrows([]); board.setHighlights({}); board.setBadges([]);
    board.setPosition(s, { animate: false });
    board.setInteractive(s.turn, onMove);
    const who = s.turn === 'w' ? 'White' : 'Black';
    const m = P.themes.find(t => t.startsWith('mateIn'));
    say(`${who} to move. ${m && P.moves.length <= 5 ? `Find checkmate in ${Math.ceil(P.moves.length / 2)}.` : P.any ? 'You made a mistake here in a real game. Find the best move.' : theme ? `Find the ${THEMES[theme].n.toLowerCase()}.` : 'Find the best move.'}`, '', false);
  }
  let lastMsg = { t: '', cls: '' };
  function msg(t, cls = '') {
    $('#pmsg').innerHTML = `<div class="bubble op ${cls}"><span class="av pf">${faceSVG(COACH.face, cls === 'ok' ? 'happy' : cls === 'bad' ? 'worried' : 'smile')}</span><div class="txt">${t}</div></div>`;
  }
  function say(t, cls = '', speak = true) { lastMsg = { t, cls }; msg(t, cls); if (speak) talk(t); controls() }
  function controls() {
    const pz = P ? R.fromFEN(P.fen) : null;
    $('#pinfo').innerHTML = `<div class="pzturn"><i style="background:${pz && pz.turn === 'w' ? '#fff' : '#111'}"></i>${pz ? (pz.turn === 'w' ? 'White' : 'Black') + ' to move' : ''}</div>`;
    if (rush) {
      const left = rush.running ? Math.max(0, rush.end - Date.now()) : 180000;
      $('#ptop').innerHTML = `<div class="card rush"><div><div class="dim" style="font-size:.8rem">Score</div><div class="sc">${rush.score}</div></div><div class="clock ${rush.running ? 'run' : ''} ${left < 20000 ? 'low' : ''}" id="rclk">${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}</div><div class="strikes">${[0, 1, 2].map(k => `<i class="${k < rush.strikes ? 'x' : ''}">${k < rush.strikes ? '✕' : ''}</i>`).join('')}</div></div>`;
    } else {
      const td = theme ? Object.keys(D.themeDone[theme] || {}).length : 0, tn = theme ? countFor(theme) : 0;
      $('#ptop').innerHTML = `<div class="card pzinfo"><div style="flex:1"><b>${mode === 'rated' ? `Your puzzle rating: ${D.puzRating}` : mode === 'daily' ? new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : theme ? `${td} of ${tn} solved` : 'From your games'}</b>
        ${theme ? `<div class="pbarw"><i style="width:${tn ? Math.round(td / tn * 100) : 0}%"></i></div>` : ''}
        <div>${P && (done || failed || theme) ? P.themes.filter(t => SHOWN.includes(t)).map(tagHTML).join('') : P && !done ? '<span class="tag">Themes show after you solve it</span>' : ''}${P && P.rating && (done || failed) ? `<span class="tag">Puzzle ${P.rating}</span>` : ''}</div></div></div>`;
    }
    const b = [];
    if (!rush) {
      if (!done && !failed) b.push(['hint', '💡', hintStep === 0 ? 'Hint' : hintStep === 1 ? 'More help' : 'Show move'], ['sol', '👀', 'Solution']);
      if (failed && !done) b.push(['hint', '💡', hintStep === 0 ? 'Hint' : hintStep === 1 ? 'More help' : 'Show move'], ['sol', '👀', 'Solution']);
      if (done || failed) b.push(['next', '▶️', theme ? 'Next one' : 'Next puzzle']);
      if (mode === 'daily' && (done || failed)) b.splice(b.findIndex(x => x[0] === 'next'), 1, ['more', '🧩', 'More puzzles']);
    } else if (!rush.running) b.push(['go', '⚡', rush.strikes >= 3 || rush.over ? 'Play again' : 'Start']);
    $('#pctrl').innerHTML = b.map(([k, i, l]) => `<button data-p="${k}"><i>${i}</i>${l}</button>`).join('');
    $('#pctrl').querySelectorAll('[data-p]').forEach(x => x.onclick = () => act(x.dataset.p));
    const pt = $('#pthemes');
    if (pt && !pt.innerHTML) { pt.innerHTML = `<h2 style="margin:1rem 0 .4rem;font-size:1rem">Practice a theme</h2><div class="chips">${LESSONS.filter(([t]) => countFor(t) > 0).map(([t]) => `<button class="chip" data-th="${t}">${THEMES[t].ic} ${THEMES[t].n}</button>`).join('')}<button class="chip" data-go="learn">📚 All lessons</button></div>`; pt.querySelectorAll('[data-th]').forEach(e => e.onclick = () => ctx.go('puzzles', 'theme:' + e.dataset.th)); bindGo() }
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
    snd.play(R.inCheck(ns, ns.turn) ? 'check' : m.captured ? 'capture' : 'move');
    board.setArrows([]); board.setHighlights({});
    if (uci === want || mates) {
      s = ns; last = m; step++;
      board.setPosition(s, { animate: true, last: m });
      board.setBadges([{ sq: m.to, color: A.LABELS.best.c, html: '✓' }]);
      if (step >= P.moves.length || mates) return solved();
      busy = true; board.setInteractive(null); hintStep = 0;
      say(rush ? '✓ Keep going…' : pick(['Correct! Keep going.', 'Yes! Now finish it.', 'Good. What’s next?']), 'ok', !rush);
      setTimeout(() => {
        if (!alive) return;
        const rm = R.uciToMove(s, P.moves[step]); const n2 = R.makeMove(s, rm);
        snd.play(R.inCheck(n2, n2.turn) ? 'check' : rm.captured ? 'capture' : 'move');
        s = n2; last = rm; step++; busy = false; board.setBadges([]);
        board.setPosition(s, { animate: true, last: rm }); board.setInteractive(s.turn, onMove);
      }, 550);
      return;
    }
    // wrong move: show it, explain why it fails, then put it back
    board.setPosition(ns, { animate: true, last: m }); board.setInteractive(null);
    board.setBadges([{ sq: m.to, color: A.LABELS.mistake.c, html: '✕' }]);
    snd.play('bad');
    if (rush) { rush.strikes++; say(`❌ Not that one.${rush.strikes >= 3 ? '' : ' Next puzzle!'}`, 'bad', false); setTimeout(() => { if (!alive) return; if (rush.strikes >= 3) endRush() ; else load(choose()) }, 900); return }
    let rr = '';
    if (!failed) { failed = true; rr = resultRating(false); if (P.rating != null && D.solved[P.id] == null && mode === 'rated') D.solved[P.id] = 0; save() }
    busy = true; const myWhy = ++why, san = R.toSAN(s, m);
    say(`Not quite.${rr ? ` <span class="ns">Rating${rr}</span>` : ''} <span class="dim">Let me show you what happens…</span>`, 'bad', false);
    whyWrong(ns, m, san).then(text => {
      if (!alive || myWhy !== why) return;
      say(`${text} Try again!${rr ? ` <span class="ns dim">Rating${rr}</span>` : ''}`, 'bad');
      setTimeout(() => { if (!alive || myWhy !== why || done) return; busy = false; board.setArrows([]); board.setBadges([]); board.setPosition(s, { animate: true, last }); board.setInteractive(s.turn, onMove) }, 1600);
    });
  }
  // Ask Stockfish what the opponent does after the wrong move, and say it in words.
  async function whyWrong(ns, m, san) {
    if (R.legalMoves(ns).length === 0) return `${san} is stalemate! That throws away the win.`;
    try {
      const r = await analyse(R.toFEN(ns), { depth: 12, tag: 'pz' }), l = r.lines[0]; if (!l) return `${san} isn’t it.`;
      const reply = R.uciToMove(ns, l.uci), rsan = A.sanOf(ns, l.uci); if (!reply) return `${san} isn’t it.`;
      board.setArrows([{ from: reply.from, to: reply.to, color: 'r' }]);
      const them = ns.turn === 'w' ? 'White' : 'Black';
      if (l.mate != null && l.mate > 0) return `After ${san}, ${them} has ${l.mate === 1 ? `checkmate with ${rsan}` : `a forced mate starting with ${rsan}`}!`;
      if (reply.captured && A.PV[reply.captured.toLowerCase()] >= 1) return `After ${san}, ${them} plays ${rsan}, winning your ${A.PNAME[reply.captured.toLowerCase()]}.`;
      const ns2 = R.makeMove(ns, reply);
      if (R.inCheck(ns2, ns2.turn)) return `After ${san}, ${them} answers with ${rsan}, check, and your attack is over.`;
      const sc = l.cp; // from their point of view
      if (sc > -150) return `${san} lets ${them} off the hook. After ${rsan}, ${them} is ${sc > 150 ? 'better' : 'fine'}. There’s something much stronger.`;
      return `${san} is okay, but there’s a much stronger move. ${them} answers ${rsan}.`;
    } catch (e) { return `${san} isn’t the best move.` }
  }
  function solved() {
    done = true; why++; board.setInteractive(null); snd.play('good');
    if (rush) { rush.score++; say('✅ Solved!', 'ok', false); setTimeout(() => alive && load(choose()), 500); return }
    let rr = '';
    if (!failed) { rr = hintStep ? '' : resultRating(true); if (mode === 'rated' || P.any) D.solved[P.id] = 1 } else if (P.any) D.solved[P.id] = 1;
    if (mode === 'daily') D.daily[new Date().toISOString().slice(0, 10)] = 1;
    if (theme && !failed) (D.themeDone[theme] = D.themeDone[theme] || {})[P.id] = 1;
    for (const t of P.themes) if (!failed && !hintStep && LESSONS.some(l => l[0] === t)) (D.themeDone[t] = D.themeDone[t] || {})[P.id] = 1;
    save();
    const head = failed ? 'Got it this time!' : hintStep ? 'Solved with a hint.' : pick(['Correct! 🎉', 'Nice! 🎉', 'Perfect! 🎉', 'You got it! 🎉']);
    say(`<b>${head}</b>${rr ? ` <span class="ns">Rating${rr}</span>` : ''}<br>${esc(explain(P.fen, P.moves))}`, 'ok');
  }
  function act(k) {
    if (k === 'next') { voice.stop(); return load(choose()) }
    if (k === 'more') return ctx.go('puzzles', 'rated');
    if (k === 'hint') {
      if (busy) return;
      const m = R.uciToMove(s, P.moves[step]); if (!m) return;
      hintStep = Math.min(3, hintStep + 1);
      if (hintStep === 1) say(`💡 ${esc(step === 0 ? ideaHint(P.fen, P.moves) : 'Keep the pressure on. Look for the most forcing move.')}`);
      else if (hintStep === 2) { board.setHighlights({ [m.from]: 'hint' }); say(`💡 Use your <b>${A.PNAME[m.piece.toLowerCase()]}</b> on ${R.sqName(m.from)}.`) }
      else { board.setArrows([{ from: m.from, to: m.to, color: 'b' }]); say(`💡 Play <b>${esc(A.sanOf(s, P.moves[step]))}</b>.`) }
      return;
    }
    if (k === 'sol') {
      if (busy) return;
      if (!failed && !done) { failed = true; resultRating(false); if (P.rating != null && mode === 'rated') D.solved[P.id] = 0; save() }
      busy = true; board.setInteractive(null); why++;
      const playOut = () => {
        if (!alive) return;
        if (step >= P.moves.length) { busy = false; done = true; say(`Here’s the solution.<br>${esc(explain(P.fen, P.moves))}`); return }
        const m = R.uciToMove(s, P.moves[step]); if (!m) { busy = false; done = true; say('Here’s the solution.'); return }
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
    const t = `⏱ Time! You scored <b>${rush.score}</b>.${best ? ' 🏆 New personal best!' : ` Your best is ${D.rushBest}.`}`;
    say(t, best ? 'ok' : '', false); voice.say(t, COACH);
  }
  if (typeof window !== 'undefined') window.__pz = () => ({ P, step, fen: s && R.toFEN(s) }); // used by tests
  if (rush) { s = R.initState(); P = null; board.setPosition(s, { animate: false }); say(`Solve as many puzzles as you can in 3 minutes. They get harder as you go. 3 wrong answers and you're out!${D.rushBest ? ` Your best: <b>${D.rushBest}</b>.` : ''}`, '', false) }
  else load(choose());
  return () => { alive = false; clearInterval(rushT); voice.stop(); clearQueue('pz') };
}
const pick = a => a[Math.floor(Math.random() * a.length)];

// ----- Lessons: learn an idea, then practice it -----
export function learnView(ctx) {
  const { D, $, esc, top, bindGo, app } = ctx;
  D.themeDone = D.themeDone || {};
  app.innerHTML = `${top('📚 Lessons', 'home')}<div class="page">
    <div class="bubble op"><span class="av pf">${faceSVG(COACH.face, 'smile')}</span><div class="txt">Every puzzle is built on a few ideas. Learn one, then practice it until you spot it in your own games. Start at the top. Most games at every level are won by these.</div></div>
    <div class="lessons">${LESSONS.filter(([t]) => countFor(t) > 0).map(([t, about]) => {
      const n = countFor(t), d = Math.min(n, Object.keys(D.themeDone[t] || {}).length), pct = n ? Math.round(d / n * 100) : 0, star = n > 0 && d >= Math.min(10, n);
      return `<button class="lesson" data-ls="${t}"><span class="lic">${THEMES[t].ic}</span><div style="flex:1;min-width:0"><b>${THEMES[t].n} ${star ? '⭐' : ''}</b><span>${esc(about.split('. ')[0].replace(/\.$/, ''))}.</span><div class="pbarw"><i style="width:${pct}%"></i></div></div><em>${d}/${n}</em></button>`;
    }).join('')}</div></div>`;
  bindGo();
  app.querySelectorAll('[data-ls]').forEach(e => e.onclick = () => lesson(ctx, e.dataset.ls));
}
function lesson(ctx, t) {
  const { D, $, esc, top, bindGo, app, newBoard } = ctx;
  const L = LESSONS.find(x => x[0] === t), ex = PUZZLES.filter(p => p.themes.includes(t)).sort((a, b) => a.rating - b.rating)[0];
  app.innerHTML = `${top(`${THEMES[t].ic} ${THEMES[t].n}`, 'learn')}<div class="game"><div class="gcol"><div class="pbar"><div class="pzturn">Example</div></div><div class="gboard"><div id="bd"></div></div></div>
    <div class="side"><div class="bubble op"><span class="av pf">${faceSVG(COACH.face, 'smile')}</span><div class="txt" id="ltx">${esc(L[1])}<br><br><b>How to spot it:</b> ${esc(L[2])}</div></div>
    <div class="ctrl"><button id="exb"><i>▶️</i>Show example</button><button id="prb" class="pri"><i>🧩</i>Practice (${countFor(t)})</button></div></div></div>`;
  bindGo();
  const board = newBoard($('#bd'));
  let s = ex ? R.fromFEN(ex.fen) : R.initState(); board.flip(s.turn); board.setPosition(s, { animate: false });
  voice.say(`${THEMES[t].n}. ${L[1]} How to spot it: ${L[2]}`, COACH);
  $('#prb').onclick = () => { voice.stop(); ctx.go('puzzles', 'theme:' + t) };
  let playing = false;
  $('#exb').onclick = () => {
    if (!ex || playing) return; playing = true; s = R.fromFEN(ex.fen); board.setPosition(s, { animate: false }); board.setArrows([]);
    let i = 0; const stepF = () => {
      if (i >= ex.moves.length) { playing = false; const t2 = explain(ex.fen, ex.moves); $('#ltx').innerHTML = `${esc(t2)}<br><br><b>How to spot it:</b> ${esc(L[2])}`; voice.say(t2, COACH); return }
      const m = R.uciToMove(s, ex.moves[i]); board.setArrows([{ from: m.from, to: m.to, color: i % 2 ? 'r' : 'g' }]);
      setTimeout(() => { s = R.makeMove(s, m); snd.play(m.captured ? 'capture' : 'move'); board.setPosition(s, { animate: true, last: m }); board.setArrows([]); i++; setTimeout(stepF, 650) }, 800);
    };
    stepF();
  };
}
