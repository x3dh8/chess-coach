// Chess app: bots, coach, Game Review, puzzles. Everything runs on this device.
import * as R from './rules.js';
import { createBoard } from './board.js';
import { pieceSVG, SETS } from './pieces.js';
import { analyse, clearQueue } from './engine.js';
import { BOTS, COACHES, COACH_LINES, LEGACY, LEVELS, STYLE_NAMES, botMove, pick, line, moodFor, levelOf } from './bots.js';
import { faceSVG } from './faces.js';
import * as voice from './voice.js';
import { moveTactics, ideaHint, puzzleThemes, THEMES } from './themes.js';
import * as A from './analysis.js';
import { openingName } from './openings.js';
import * as snd from './sound.js';
import { PUZZLES } from './puzzles-data.js';
import { reviewView, historyView, statsView } from './review.js';
import { puzzleView, learnView } from './puzzles.js';

/* ---------- saved data ---------- */
const KEY = 'cxa1';
const DEF = { set: { theme: 'green', pieces: 'classic', sound: true, coords: true, dots: true, anim: true, autoQ: false, premove: true, evalbar: false, voice: true, accents: true, engine: 'builtin', azKey: '', azRegion: '' }, rating: 800, ratingHist: [], puzRating: 800, puzHist: [], games: [], cur: null, solved: {}, rushBest: 0, daily: {}, themeDone: {}, pick: { bot: 'olive', color: 'w', tc: 'none', coach: 'coach_sam', coachLevel: 800 } };
export let D = (() => { try { const d = JSON.parse(localStorage.getItem(KEY)); return d ? { ...DEF, ...d, set: { ...DEF.set, ...d.set }, pick: { ...DEF.pick, ...d.pick } } : structuredClone(DEF) } catch (e) { return structuredClone(DEF) } })();
let saveT = null;
export const save = (now) => { clearTimeout(saveT); const f = () => { try { localStorage.setItem(KEY, JSON.stringify(D)) } catch (e) { toast('Storage is full') } }; now ? f() : (saveT = setTimeout(f, 300)) };
addEventListener('pagehide', () => save(true));
snd.setSound(D.set.sound);
voice.setVoice({ on: D.set.voice, accents: D.set.accents, engine: D.set.engine, azKey: D.set.azKey, azRegion: D.set.azRegion });
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });

/* ---------- helpers ---------- */
export const $ = (q, el = document) => el.querySelector(q);
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function toast(t, ms = 2200) { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), ms) }
export function modal(html, bind) {
  const o = document.createElement('div'); o.className = 'ov'; o.innerHTML = `<div class="modal">${html}</div>`; document.body.appendChild(o);
  const close = () => o.remove(); o.addEventListener('click', e => { if (e.target === o) close() });
  bind && bind(o, close); return close;
}
export const botById = id => BOTS.find(b => b.id === id) || COACHES.find(c => c.id === id) || LEGACY.find(c => c.id === id);
export const av = (who, cls = '', mood) => who.face ? `<span class="av pf ${cls}">${faceSVG(who.face, mood)}</span>` : `<span class="av ${cls}" style="background:${who.color}">${who.emoji}</span>`;
export const ME = { name: 'You', emoji: '😎', color: '#5d8c32' };
const fmtClock = ms => { ms = Math.max(0, ms); if (ms < 20000) return (ms / 1000).toFixed(1); const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` };
export function gameData(moves) { // states, sans, moves from a list of UCI moves
  const g = R.replay(moves); return { states: g.states, sans: g.sans, moves: g.moves };
}
export function capturedHTML(s, col) { // pieces `col` has taken, plus material lead
  const start = { p: 8, n: 2, b: 2, r: 2, q: 1 }, have = { w: {}, b: {} };
  s.board.forEach(p => { if (p) { const c = R.colorOf(p), t = p.toLowerCase(); have[c][t] = (have[c][t] || 0) + 1 } });
  const opp = R.other(col); let h = '', mat = 0;
  for (const t of ['p', 'b', 'n', 'r', 'q']) { const lost = Math.max(0, start[t] - (have[opp][t] || 0)); for (let i = 0; i < lost; i++) h += `<span class="cp">${pieceSVG(opp === 'w' ? t.toUpperCase() : t, D.set.pieces)}</span>` }
  for (const t in A.PV) mat += ((have[col][t] || 0) - (have[opp][t] || 0)) * A.PV[t];
  return h + (mat > 0 ? `<i>+${mat}</i>` : '');
}
export function themeClass() { return 'th-' + D.set.theme }
export function newBoard(el) { const b = createBoard(el, { pieceSet: D.set.pieces }); b.setOptions({ coords: D.set.coords, showDots: D.set.dots, autoQueen: D.set.autoQ, animMs: D.set.anim ? 180 : 0 }); return b }

/* ---------- screens ---------- */
const app = $('#app');
let view = 'home', cleanup = null;
export function go(v, arg) {
  if (cleanup) { try { cleanup() } catch (e) { } cleanup = null }
  view = v; window.scrollTo(0, 0); document.body.className = themeClass();
  const V = { home, bots: pickBot, coach: pickCoach, game: gameView, settings, review: a => reviewView(ctx, a), history: () => historyView(ctx), stats: () => statsView(ctx), puzzles: a => puzzleView(ctx, a || 'rated'), learn: () => learnView(ctx) }[v];
  cleanup = V(arg) || null;
}
const top = (title, back = 'home', right = '') => `<div class="top">${back ? `<button class="iconbtn" data-go="${back}" aria-label="Back">‹</button>` : ''}<h1>${title}</h1>${right}</div>`;
function bindGo(root = app) { root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go, b.dataset.arg)) }
export const ctx = { D, save, go, toast, modal, esc, $, av, ME, botById, top, bindGo, app, newBoard, capturedHTML, gameData, themeClass, startGame: (...a) => startGame(...a) };

function home() {
  const cur = D.cur && !D.cur.result ? D.cur : null, bot = cur && botById(cur.oppId);
  const daily = new Date().toISOString().slice(0, 10), dailyDone = D.daily[daily];
  app.innerHTML = `${top('♟️ Chess', '', `<button class="iconbtn" data-go="settings" aria-label="Settings">⚙️</button>`)}<div class="page">
    <div class="hero"><span class="me">${ME.emoji}</span><div><b>You</b><div class="rt"><span>♟️ ${D.rating}</span><span>🧩 ${D.puzRating}</span><span>🎮 ${D.games.length} games</span></div></div></div>
    <div class="menu">
      ${cur ? `<button class="mi big" data-go="game"><span class="ic">▶️</span><div><b>Continue your game</b><span>vs ${esc(bot ? bot.name : 'bot')} · move ${Math.floor(cur.moves.length / 2) + 1}</span></div></button>` : ''}
      <button class="mi ${cur ? '' : 'big'}" data-go="bots"><span class="ic trio">${['diego', 'sofia', 'kofi'].map(id => av(botById(id), '', 'smile')).join('')}</span><div><b>Play Bots</b><span>${BOTS.length - 1} people from 250 to 2850, plus Stockfish</span></div></button>
      <button class="mi" data-go="coach"><span class="ic">${av(COACHES[0], '', 'smile')}</span><div><b>Play with a Coach</b><span>They explain every move and help you get better</span></div></button>
      <button class="mi" data-go="puzzles" data-arg="rated"><span class="ic">🧩</span><div><b>Puzzles</b><span>Rated ${D.puzRating} · ${PUZZLES.length} puzzles</span></div></button>
      <button class="mi" data-go="learn"><span class="ic">📚</span><div><b>Lessons</b><span>Forks, pins, skewers, mates… learn them, then practice</span></div></button>
      <button class="mi" data-go="puzzles" data-arg="rush"><span class="ic">⚡</span><div><b>Puzzle Rush</b><span>3 minutes, 3 strikes${D.rushBest ? ` · best ${D.rushBest}` : ''}</span></div></button>
      <button class="mi" data-go="puzzles" data-arg="daily"><span class="ic">📅</span><div><b>Daily Puzzle</b><span>${dailyDone ? 'Solved today ✅' : 'A new one every day'}</span></div></button>
      <button class="mi" data-go="puzzles" data-arg="mistakes"><span class="ic">🎯</span><div><b>Learn From Your Mistakes</b><span>Puzzles from your own reviewed games</span></div></button>
      <button class="mi" data-go="history"><span class="ic">📜</span><div><b>Game History & Review</b><span>Look back at every game</span></div></button>
      <button class="mi" data-go="stats"><span class="ic">📈</span><div><b>Stats</b><span>Your rating over time, accuracy, openings</span></div></button>
    </div></div>`;
  bindGo();
}

function pickBot() {
  const P = D.pick;
  if (!BOTS.find(x => x.id === P.bot)) P.bot = 'priya';
  let greet = null;
  const draw = (scroll) => {
    const b = BOTS.find(x => x.id === P.bot), lv = levelOf(b.rating);
    const hi = greet || (greet = line(b, 'hi'));
    app.innerHTML = `${top('Play Bots')}<div class="page">
      <div class="feat"><div class="fp">${av(b, 'xl', 'smile')}</div><div class="fi">
        <div class="fn"><b>${esc(b.name)}</b> <span class="flag">${b.flag}</span></div>
        <div class="fr">${b.rating}${b.engine ? '' : ` <span class="lvl lv-${lv[0]}">${lv[1]}</span>`}</div>
        <div class="ff">${b.age ? `${b.age} · ` : ''}${esc(b.from)}</div>
        <div class="fs">${esc(STYLE_NAMES[b.style] || '')}</div></div></div>
      ${hi ? `<div class="speech">${esc(hi)}</div>` : ''}
      <p class="fbio">${esc(b.bio)}</p>
      ${LEVELS.map(([k, name]) => { const g = BOTS.filter(x => levelOf(x.rating)[0] === k); return g.length ? `<h3 class="lvh"><span class="lvl lv-${k}">${name}</span></h3><div class="ppl">${g.map(x => `<button class="pp ${x.id === b.id ? 'on' : ''}" data-bot="${x.id}">${av(x)}<b>${esc(x.name.replace('Grandma ', 'Gma '))}</b><span>${x.rating}</span></button>`).join('')}</div>` : '' }).join('')}
      <h2>I play</h2><div class="seg">${[['w', '♔ White'], ['r', '🎲 Random'], ['b', '♚ Black']].map(([k, l]) => `<button class="${P.color === k ? 'on' : ''}" data-col="${k}">${l}</button>`).join('')}</div>
      <h2>Clock</h2><div class="chips">${[['none', 'No clock'], ['1+0', '1 min'], ['3+0', '3 min'], ['3+2', '3 | 2'], ['5+0', '5 min'], ['10+0', '10 min'], ['15+10', '15 | 10'], ['30+0', '30 min']].map(([k, l]) => `<button class="chip ${P.tc === k ? 'on' : ''}" data-tc="${k}">${l}</button>`).join('')}</div>
      <p class="dim" style="font-size:.82rem;margin-top:.8rem">Games count for your rating unless you use hints or take-backs. Ratings are approximate.</p>
      <div class="startbar"><button class="btn wide" id="start">Play ${esc(b.name)}</button></div></div>`;
    bindGo();
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    app.querySelectorAll('[data-bot]').forEach(e => e.onclick = () => { if (P.bot === e.dataset.bot) return; P.bot = e.dataset.bot; greet = null; save(); draw(true) });
    app.querySelectorAll('[data-col]').forEach(e => e.onclick = () => { P.color = e.dataset.col; save(); draw() });
    app.querySelectorAll('[data-tc]').forEach(e => e.onclick = () => { P.tc = e.dataset.tc; save(); draw() });
    $('#start').onclick = () => startGame({ mode: 'bot', oppId: b.id, oppRating: b.rating, color: P.color, tc: P.tc });
  };
  draw();
}
function pickCoach() {
  const P = D.pick;
  const draw = () => {
    app.innerHTML = `${top('Play with a Coach')}<div class="page">
      <p class="mute" style="margin-top:0">Your coach plays against you at the strength you pick and talks you through the game: what each move does, what to watch out for, and how to fix mistakes. Coach games are practice, so they don't change your rating.</p>
      <div class="menu">${COACHES.map(c => `<button class="mi ${P.coach === c.id ? 'big' : ''}" data-co="${c.id}">${av(c)}<div><b>${esc(c.name)}</b><span>${esc(c.tag)}</span></div></button>`).join('')}</div>
      <h2>Coach plays at <span id="lvl">${P.coachLevel}</span></h2><input class="slider" type="range" min="250" max="2200" step="50" value="${P.coachLevel}" id="lv">
      <div class="chips" style="margin-top:.4rem">${[[400, 'Beginner'], [800, 'Novice'], [1200, 'Club'], [1600, 'Strong'], [2000, 'Expert']].map(([v, l]) => `<button class="chip ${+P.coachLevel === v ? 'on' : ''}" data-lv="${v}">${l}</button>`).join('')}</div>
      <h2>I play</h2><div class="seg">${[['w', '♔ White'], ['r', '🎲 Random'], ['b', '♚ Black']].map(([k, l]) => `<button class="${P.color === k ? 'on' : ''}" data-col="${k}">${l}</button>`).join('')}</div>
      <div class="startbar"><button class="btn wide" id="start">Start lesson 🎓</button></div></div>`;
    bindGo();
    app.querySelectorAll('[data-co]').forEach(e => e.onclick = () => { P.coach = e.dataset.co; save(); draw() });
    app.querySelectorAll('[data-col]').forEach(e => e.onclick = () => { P.color = e.dataset.col; save(); draw() });
    app.querySelectorAll('[data-lv]').forEach(e => e.onclick = () => { P.coachLevel = +e.dataset.lv; save(); draw() });
    $('#lv').oninput = e => { P.coachLevel = +e.target.value; $('#lvl').textContent = P.coachLevel; save() };
    $('#start').onclick = () => startGame({ mode: 'coach', oppId: P.coach, oppRating: +P.coachLevel, color: P.color, tc: 'none' });
  };
  draw();
}

/* ---------- playing a game ---------- */
function startGame({ mode, oppId, oppRating, color, tc }) {
  const my = color === 'r' ? (Math.random() < .5 ? 'w' : 'b') : color;
  const [base, inc] = tc && tc !== 'none' ? tc.split('+').map(Number) : [0, 0];
  D.cur = { id: Date.now().toString(36), mode, oppId, oppRating, my, tc: base ? { base: base * 60000, inc: inc * 1000, label: tc } : null, clock: base ? { w: base * 60000, b: base * 60000 } : null, moves: [], ev: {}, start: Date.now(), result: null, takebacks: 0, hints: 0, chat: [] };
  save(true); snd.play('start'); go('game');
}
function gameView() {
  const G = D.cur; if (!G) { go('home'); return }
  const opp = botById(G.oppId), coach = G.mode === 'coach', lines = coach ? COACH_LINES[G.oppId] : null;
  let gd = gameData(G.moves), board, alive = true, thinking = false, clockT = null, turnStart = Date.now(), lastTick = 0;
  let viewPly = null; // null = live position; a number = looking back at an earlier move
  let say = null;     // { who, text, label, acts:[[id,label]] }
  let mood = 'neutral', moodT = null, spoken = null; // the opponent's face, and the last thing said out loud
  const setMood = (m, ms) => { clearTimeout(moodT); mood = m; refreshFace(); if (ms) moodT = setTimeout(() => { mood = moodFor(opp, G._botEval); refreshFace() }, ms) };
  const refreshFace = () => { const a = $('#topBar .av'), b = $('#say .bubble.op .av'); const h = opp.face ? faceSVG(opp.face, thinking && mood === 'neutral' ? 'think' : mood) : null; if (h) { if (a) a.innerHTML = h; if (b) b.innerHTML = h } const t = $('#topBar .thk'); if (t) t.hidden = !thinking };
  let hintStep = 0, hintUci = null, paused = false;
  const S = () => gd.states[gd.states.length - 1];
  const over = () => !!G.result;
  const myTurn = () => !over() && S().turn === G.my;
  app.innerHTML = `${top(coach ? `🎓 ${esc(opp.name)}` : `vs ${esc(opp.name)} ${opp.flag || opp.emoji || ''}`, 'home', `<button class="iconbtn" id="flipB" aria-label="Flip board">⇅</button>`)}
    <div class="game"><div class="gcol"><div class="pbar" id="topBar"></div><div class="gboard"><div id="bd"></div></div><div class="pbar" id="botBar"></div></div>
    <div class="side"><div id="say"></div><div class="opening" id="open"></div><div class="moves" id="mv"></div><div class="ctrl" id="ctrl"></div><div class="nav" id="nav"></div></div></div>`;
  bindGo();
  board = newBoard($('#bd'));
  if (G.my === 'b') board.flip('b');
  $('#flipB').onclick = () => board.flip();
  // ----- drawing -----
  function bars() {
    const s = viewPly == null ? S() : gd.states[viewPly], oppCol = R.other(G.my);
    const bar = (who, col, rating, isOpp) => {
      const run = !over() && S().turn === col && G.moves.length >= (col === 'w' ? 0 : 1) && G.tc, ms = G.clock ? G.clock[col] - (run && G.moves.length >= 2 ? Date.now() - turnStart : 0) : 0;
      return `${isOpp ? av(who, '', thinking && mood === 'neutral' ? 'think' : mood) : av(who)}<div class="nm"><b>${esc(who.name)}</b>${isOpp && who.flag ? ` <span class="flag">${who.flag}</span>` : ''}<span class="rt">${rating ? `(${rating})` : ''}</span>${isOpp ? `<span class="thk" ${thinking ? '' : 'hidden'}><i></i><i></i><i></i></span>` : ''}<div class="caps">${capturedHTML(s, col)}</div></div>${G.tc ? `<div class="clock ${run ? 'run' : ''} ${ms < 20000 ? 'low' : ''}" data-clk="${col}">${fmtClock(ms)}</div>` : ''}`;
    };
    $('#topBar').innerHTML = bar(opp, oppCol, G.oppRating, true);
    $('#botBar').innerHTML = bar(ME, G.my, coach ? null : D.rating);
  }
  function moveList() {
    let h = '';
    for (let i = 0; i < gd.sans.length; i += 2) {
      h += `<span class="n">${i / 2 + 1}.</span>`;
      for (const k of [i, i + 1]) h += k < gd.sans.length ? `<span class="mv ${(viewPly == null ? gd.sans.length : viewPly) === k + 1 ? 'on' : ''}" data-ply="${k + 1}">${esc(gd.sans[k])}</span>` : '<span></span>';
    }
    const el = $('#mv'); el.innerHTML = h || '<span></span><span class="dim" style="grid-column:2/4;padding:.3rem">Moves show up here</span>';
    el.querySelectorAll('[data-ply]').forEach(e => e.onclick = () => { viewPly = +e.dataset.ply === gd.sans.length ? null : +e.dataset.ply; show(false) });
    const on = el.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    const op = openingName(gd.sans); $('#open').innerHTML = op ? `📖 <span>${esc(op.name)}</span>` : '';
  }
  function bubble() {
    const el = $('#say'); if (!say) { el.innerHTML = ''; return }
    const w = say.who === 'hint' ? { emoji: '💡', color: '#5c8bb0' } : opp, L = say.label && A.LABELS[say.label];
    el.innerHTML = `<div class="bubble ${say.who === 'hint' ? '' : 'op'}">${say.who === 'hint' ? av(w) : av(w, '', mood)}<div class="txt">${say.pre || ''}${L ? `<b class="lbl" style="color:${L.c}">${L.g} ${L.n}</b><br>` : ''}${say.text}${say.acts ? `<div class="acts">${say.acts.map(([id, l, cls]) => `<button class="btn sm ${cls || 'sec'}" data-act="${id}">${l}</button>`).join('')}</div>` : ''}</div></div>`;
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act(b.dataset.act));
    if (say !== spoken) { spoken = say; if (!say.quiet) voice.say(say.speak || ((L && say.who === 'opp' && coach ? L.n + '. ' : '') + say.text), say.who === 'hint' ? null : opp, { interrupt: !say.queue, mood: say.who === 'hint' ? null : mood }) }
  }
  function controls() {
    const n = G.moves.length;
    const c = over() ? [['review', '📊', 'Review'], ['rematch', '🔁', 'Rematch'], ['newbot', '🤖', 'New game']]
      : [[n < 2 ? 'abort' : 'resign', n < 2 ? '✕' : '🏳️', n < 2 ? 'Abort' : 'Resign'], ['draw', '½', 'Draw'], ['takeback', '↩️', 'Take back'], ['hint', '💡', hintStep ? 'More hint' : 'Hint']];
    $('#ctrl').innerHTML = c.map(([id, ic, l]) => `<button data-act="${id}" ${id === 'takeback' && (!n || thinking && n < 2) ? 'disabled' : ''} ${id === 'hint' && !myTurn() ? 'disabled' : ''}><i>${ic}</i>${l}</button>`).join('');
    $('#ctrl').querySelectorAll('[data-act]').forEach(b => b.onclick = () => act(b.dataset.act, b));
    $('#nav').innerHTML = ['⏮', '◀', '▶', '⏭'].map((x, i) => `<button data-nav="${i}">${x}</button>`).join('');
    $('#nav').querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
      const k = +b.dataset.nav, cur = viewPly == null ? gd.sans.length : viewPly;
      const t = k === 0 ? 0 : k === 1 ? Math.max(0, cur - 1) : k === 2 ? cur + 1 : gd.sans.length;
      viewPly = t >= gd.sans.length ? null : t; show(true);
    });
  }
  function show(animate = true) {
    const ply = viewPly == null ? gd.sans.length : viewPly, s = gd.states[ply], m = ply ? gd.moves[ply - 1] : null;
    board.setPosition(s, { animate: animate && D.set.anim, last: m });
    board.setInteractive(viewPly == null && !over() && !paused ? G.my : null, onMyMove, { premove: D.set.premove && G.mode === 'bot' });
    if (viewPly != null) board.setArrows([]);
    bars(); moveList(); controls(); bubble();
  }
  // ----- moves -----
  function playSound(s, m, ns) {
    if (R.inCheck(ns, ns.turn)) snd.play('check'); else if (m.promo) snd.play('promote'); else if (m.flag && m.flag.startsWith('castle')) snd.play('castle'); else snd.play(m.captured ? 'capture' : 'move');
  }
  function apply(m) {
    const s = S(), L = R.legalMoves(s), san = R.toSAN(s, m, L), ns = R.makeMove(s, m), now = Date.now();
    if (G.clock && G.moves.length >= 2) { G.clock[s.turn] = Math.max(0, G.clock[s.turn] - (now - turnStart)) + G.tc.inc }
    G.moves.push(R.moveToUci(m)); gd.states.push(ns); gd.sans.push(san); gd.moves.push(m);
    turnStart = now; hintStep = 0; hintUci = null; board.setArrows([]); board.setHighlights({});
    playSound(s, m, ns);
    const end = R.gameEnd(ns, gd.states.map(R.posKey));
    if (end) finish(end.result, end.reason);
    save(); viewPly = null; show(true);
  }
  function onMyMove(m) {
    if (!myTurn() || paused) return;
    const ply = G.moves.length;
    apply(m);
    if (over()) return;
    if (coach) coachCheck(ply); else botTurn();
  }
  async function botTurn() {
    if (over() || S().turn === G.my || thinking) return;
    thinking = true; controls(); refreshFace();
    const ply = G.moves.length, t0 = Date.now(), s = S(), L = R.legalMoves(s);
    let r = null;
    try { r = await botMove(opp.rating ? opp : { ...opp, style: 'solid', rep: [] }, s, gd.sans, G.oppRating) } catch (e) { console.warn(e) }
    if (!alive || G !== D.cur || G.moves.length !== ply || over()) { thinking = false; refreshFace(); return }
    const m = r && R.uciToMove(s, r.uci);
    // think like a person: quick with book moves and recaptures, longer when it's complicated
    const last = gd.moves[gd.moves.length - 1], recapture = m && last && last.captured && m.to === last.to;
    let want;
    if (r && r.book) want = 300 + Math.random() * 700;
    else if (L.length === 1 || recapture) want = 250 + Math.random() * 500;
    else {
      const base = G.oppRating < 800 ? 600 : G.oppRating < 1500 ? 900 : 1200, busy = Math.min(1.6, .6 + L.length / 40) * (m && m.captured ? .8 : 1);
      want = base * busy * (.5 + Math.random()) + (Math.random() < .12 ? 1200 + Math.random() * 1800 : 0);
      if (G.tc) { const left = G.clock[R.other(G.my)]; want = Math.min(want * (G.tc.base >= 600000 ? 1.4 : 1), left / 30 + G.tc.inc * .6) }
    }
    if (G.moves.length < 2) want = Math.min(want, 900);
    const wait = Math.max(0, want - (Date.now() - t0)); if (wait) await new Promise(res => setTimeout(res, wait));
    if (!alive || G !== D.cur || G.moves.length !== ply || over()) { thinking = false; refreshFace(); return }
    thinking = false;
    if (!m) { if (L.length) apply(L[0]); return }
    // how it's going, and what they say about it
    if (!coach && opp.voice) {
      const prev = G._botEval, now = r.eval != null ? r.eval : prev;
      // a real person gives up in a hopeless position
      G._lost = now != null && now <= -900 ? (G._lost || 0) + 1 : 0;
      if (G._lost >= 3 && G.oppRating >= 900 && G.moves.length > 24 && Math.random() < .45 && line(opp, 'resign')) {
        chat(line(opp, 'resign')); setMood('sad'); finish(G.my === 'w' ? '1-0' : '0-1', 'resignation'); return;
      }
      let said = null, flash = null;
      if (prev != null && now != null) {
        if (prev < 150 && now > 350) { said = line(opp, 'gift'); flash = 'surprised' }
        else if (prev > -150 && now < -350) { said = line(opp, G._slip ? 'oops' : 'good'); flash = G._slip ? 'surprised' : 'worried' }
      }
      G._botEval = now; G._slip = !!(r && r.slip);
      const ns = R.makeMove(s, m), op = openingName([...gd.sans, R.toSAN(s, m, L)]), prevOp = openingName(gd.sans);
      if (!said && m.captured && A.PV[m.captured.toLowerCase()] >= 3 && Math.random() < .5) said = line(opp, 'take');
      if (!said && R.inCheck(ns, ns.turn) && Math.random() < .3) said = line(opp, 'check');
      if (!said && op && (!prevOp || op.name !== prevOp.name) && G.moves.length >= 3 && G.moves.length < 14 && Math.random() < .3 && !['kid', 'grandma', 'engine', 'quiet'].includes(opp.voice))
        said = pick([`Ah, the ${op.name}.`, `${op.name}. I know this one.`, `The ${op.name}! I like it.`]);
      if (!said && now != null && Math.random() < .12) said = line(opp, now > 400 ? 'winning' : now < -400 ? 'losing' : '_');
      if (said) chat(said);
      if (flash) setMood(flash, 1600); else setMood(moodFor(opp, now));
    }
    apply(m);
    if (coach && !over()) coachAfterBot(m);
    // premove?
    if (!over() && board.hasPremove()) {
      const p = board.takePremove(), L2 = R.legalMoves(S()), pm = L2.filter(x => x.from === p.from && x.to === p.to);
      if (pm.length) setTimeout(() => onMyMove(pm.find(x => !x.promo || x.promo === (G.my === 'w' ? 'Q' : 'q')) || pm[0]), 60);
    }
    if (coach && !over()) prepCoach();
  }
  const chat = t => { if (!t) return; say = { who: 'opp', text: esc(t) }; bubble() };
  // ----- coach -----
  async function evAt(ply, depth = 13) { // analysis of the position before move `ply` (cached)
    if (G.ev[ply] && G.ev[ply].depth >= depth - 1) return G.ev[ply];
    const r = await analyse(R.toFEN(gd.states[ply]), { depth, multipv: 2, tag: 'coach' });
    if (r.lines.length || !R.legalMoves(gd.states[ply]).length) { G.ev[ply] = { best: r.best, depth: r.depth, lines: r.lines.slice(0, 2).map(l => ({ uci: l.uci, cp: l.cp, mate: l.mate })) }; save() }
    return G.ev[ply];
  }
  function prepCoach() { if (myTurn()) evAt(G.moves.length).catch(() => { }) } // think ahead while you think
  // The coach looks at every move you make: a label like chess.com, what it does, and a better idea if there was one.
  async function coachCheck(ply) {
    paused = true; board.setInteractive(null);
    say = { who: 'opp', text: '<span class="dim">Hmm, let me look at that…</span>', quiet: true }; bubble();
    try {
      const before = await evAt(ply), after = await evAt(ply + 1, 12);
      if (!alive || G !== D.cur || G.moves.length !== ply + 1) return;
      const ev = G.ev, gr = A.gradeMove(gd, ply, ev, ply > 0 && ev[ply - 1] && ev[ply] ? (A.gradeMove(gd, ply - 1, ev) || {}).label : null);
      if (!gr || !before || !after) { paused = false; say = null; show(false); botTurn(); return }
      const st = gd.states[ply], mv = gd.moves[ply], L = A.LABELS[gr.label], rex = G.oppId === 'coach_rex', maya = G.oppId === 'coach_maya';
      G._badge = { sq: mv.to, color: L.c, html: L.g.length > 2 ? L.g.slice(0, 2) : L.g };
      board.setBadges([G._badge]);
      const did = capital(A.whatItDoes(st, mv)), bestM = gr.best ? R.uciToMove(st, gr.best) : null, bestSan = gr.best ? A.sanOf(st, gr.best) : '';
      G._pre = `<div class="pre"><b style="color:${L.c}">${L.g} ${L.n}</b> <span class="dim">${esc(gd.sans[ply])}</span></div>`;
      if (A.BAD.has(gr.label) && gr.label !== 'inaccuracy' || (gr.label === 'inaccuracy' && !rex && gr.drop >= 7)) {
        snd.play('bad'); setMood('worried');
        say = { who: 'opp', label: gr.label, text: `${esc(pick(lines.oops))} ${esc(A.explainMistake(gd, ply, ev, 'me'))}`, acts: [['retry', '↩️ Try again', ''], ['showbest', '👀 Show me'], ['keep', 'Keep playing ▶']] };
        G._lastBad = { ply, best: gr.best };
        show(false); return;
      }
      paused = false;
      let text;
      if (gr.label === 'brilliant' || gr.label === 'great') { snd.play('good'); setMood('happy', 2500); text = `${esc(pick(lines[gr.label]))} ${esc(did)}.` }
      else if (gr.label === 'best' || gr.label === 'excellent') { setMood('smile'); text = rex ? esc(pick(lines.best)) : `${esc(pick(lines.best))} ${esc(did)}.` }
      else if (gr.label === 'book') { const op = openingName(gd.sans); text = op ? `That’s book: a well-known move in the <b>${esc(op.name)}</b>.${maya || ply < 4 ? ` ${esc(did)}.` : ''}` : `A good opening move. ${esc(did)}.` }
      else if (gr.label === 'inaccuracy') { setMood('neutral'); G._lastBad = { ply, best: gr.best }; text = esc(A.explainMistake(gd, ply, ev, 'me')); say = { who: 'opp', label: gr.label, text, acts: [['retry', '↩️ Try the better move', '']] }; show(false); botTurn(); return }
      else text = `${esc(pick(lines.good))} ${esc(did)}.${bestM ? ` <span class="dim">${esc(bestSan)} was a little better: ${esc(A.whatItDoes(st, bestM))}.</span>` : ''}`;
      say = { who: 'opp', label: gr.label, text };
      show(false); botTurn();
    } catch (e) { console.warn(e); paused = false; show(false); botTurn() }
  }
  // After the coach moves: what that move was about, what to watch out for, and something to think about.
  async function coachAfterBot(m) {
    const s = S(), prev = gd.states[gd.states.length - 2], ply = G.moves.length, theirSan = gd.sans[gd.sans.length - 1];
    const rex = G.oppId === 'coach_rex', maya = G.oppId === 'coach_maya', parts = [];
    board.setBadges([]);
    const threats = A.threatsAgainst(s, G.my), before = A.threatsAgainst({ ...prev, turn: G.my }, G.my), fresh = threats.filter(t => !before.some(b => b.sq === t.sq));
    if (R.inCheck(s, G.my)) parts.push(`${esc(theirSan)} is check! You have to move your king, block, or take the checking piece.`);
    else if (fresh.length) { const t = fresh[0]; parts.push(`⚠️ ${esc(theirSan)} attacks your ${t.piece} on ${R.sqName(t.sq)}. Move it or protect it.`); board.setHighlights({ [t.sq]: 'bad' }) }
    else if (maya || Math.random() < (rex ? .25 : .55)) { const what = A.whatItDoes(prev, m).replace(/\byour\b/g, '§').replace(/\btheir\b/g, 'your').replace(/§/g, 'my'); parts.push(`I played ${esc(theirSan)}: ${esc(what)}.`) }
    say = { who: 'opp', pre: G._pre, text: parts.join(' ') || '<span class="dim">Your move.</span>', queue: true, quiet: !parts.length }; bubble();
    // something to think about, without giving the move away
    let e = null; try { e = await evAt(ply) } catch (err) { }
    if (!alive || G !== D.cur || G.moves.length !== ply || !e || !e.lines[0]) return;
    const l0 = e.lines[0], l1 = e.lines[1], bm = R.uciToMove(s, l0.uci), tac = bm ? moveTactics(s, bm).map(x => x.theme) : [];
    let tip = '';
    if (l0.mate != null && l0.mate > 0) tip = rex ? 'There’s a checkmate on the board. Find it.' : `There’s a checkmate${l0.mate <= 3 ? ` in ${l0.mate}` : ''} here! Look at every check.`;
    else if (tac.length && l0.cp > 150) { const t = ['fork', 'skewer', 'pin', 'discoveredAttack', 'doubleCheck', 'hangingPiece', 'promotion', 'sacrifice'].find(x => tac.includes(x)); if (t) tip = rex ? 'There’s a tactic here. Find it.' : `💡 ${THEMES[t].hint}` }
    else if (l1 && l0.cp - l1.cp > 180 && l0.cp < 400 && !rex) tip = 'Careful here: one move is much better than the rest. Take your time.';
    if (!tip && ply < 22 && Math.random() < (maya ? .7 : rex ? .2 : .45)) {
      const home = G.my === 'w' ? 7 : 0, minors = s.board.filter((p, i) => p && (i >> 3) === home && (G.my === 'w' ? 'NB' : 'nb').includes(p)).length, kHome = R.findKing(s.board, G.my) === (G.my === 'w' ? 60 : 4);
      if (minors >= 2) tip = 'Tip: get your knights and bishops out before moving the same piece twice.';
      else if (kHome && ply > 10) tip = 'Tip: castle soon to keep your king safe.';
    }
    if (!tip && Math.random() < (maya ? .35 : .15)) tip = l0.cp > 250 ? 'You’re ahead. Trade pieces to make it easier to win.' : l0.cp < -250 ? 'You’re behind, but stay active. Look for checks and threats.' : '';
    if (!tip) return;
    say = { who: 'opp', pre: G._pre, text: (parts.length ? parts.join(' ') + '<br>' : '') + esc(tip), speak: tip, queue: true }; bubble();
  }
  const capital = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  // ----- buttons -----
  async function act(id, btn) {
    if (id === 'resign') { if (btn && !btn._sure) { btn._sure = 1; btn.innerHTML = '<i>🏳️</i>Sure?'; setTimeout(() => btn && (btn._sure = 0), 3000); return } finish(G.my === 'w' ? '0-1' : '1-0', 'resignation'); return }
    if (id === 'abort') { G.result = '*'; G.reason = 'aborted'; D.cur = null; save(true); go('home'); return }
    if (id === 'draw') {
      if (G.moves.length < 20) { chat(opp.voice ? 'Too early for a draw. Let’s play on!' : 'Let’s keep playing a bit.'); return }
      const r = await analyse(R.toFEN(S()), { depth: 10, tag: 'draw' }), sc = r.lines[0] ? (S().turn === G.my ? -r.lines[0].cp : r.lines[0].cp) : 0;
      if (sc <= 30) { chat('Okay, a draw it is. 🤝'); finish('1/2-1/2', 'agreement') } else chat(opp.voice ? pick(['No thanks, I like my position.', 'I’ll play on.']) : 'No thanks.');
      return;
    }
    if (id === 'takeback') {
      if (thinking) return;
      const undo = S().turn === G.my ? 2 : 1;
      for (let k = 0; k < undo && G.moves.length; k++) { G.moves.pop(); gd.states.pop(); gd.sans.pop(); gd.moves.pop() }
      if (!coach) G.takebacks++; paused = false; say = null; turnStart = Date.now(); board.clearPremove(); board.setArrows([]); board.setHighlights({}); save(); show(true);
      if (!myTurn()) botTurn(); else if (coach) prepCoach();
      return;
    }
    if (id === 'hint') {
      if (!myTurn()) return;
      if (!coach) G.hints++;
      hintStep++;
      if (!hintUci) { const ev = await evAt(G.moves.length, 14); hintUci = ev && ev.best }
      const h = hintUci && A.hintFor(S(), hintUci); if (!h) return;
      const who = coach ? 'opp' : 'hint';
      if (hintStep === 1) { const fen = R.toFEN(S()), th = puzzleThemes(fen, [hintUci]).themes, tactic = th.some(x => !['quietMove', 'advantage', 'endgame'].includes(x)); say = { who, text: `💡 ${esc(tactic ? ideaHint(fen, [hintUci]) : 'No big tactic here. Look for your least active piece, and think about what your opponent wants to do next.')}` } }
      else if (hintStep === 2) { say = { who, text: `💡 Look at your <b>${h.piece}</b>.` }; board.setHighlights({ [h.from]: 'hint' }) }
      else { say = { who, text: `💡 Try <b>${esc(h.san)}</b>: ${esc(h.what)}.` }; board.setArrows([{ from: h.from, to: h.to, color: 'b' }]) }
      bubble(); controls(); return;
    }
    if (id === 'retry') { const b = G._lastBad; if (!b) return; while (G.moves.length > b.ply) { G.moves.pop(); gd.states.pop(); gd.sans.pop(); gd.moves.pop() } paused = false; board.setBadges([]); say = { who: 'opp', text: 'Okay, find a better move. Take your time. 🙂' }; turnStart = Date.now(); save(); show(true); prepCoach(); return }
    if (id === 'showbest') { const b = G._lastBad; if (!b) return; const s0 = gd.states[b.ply], m = R.uciToMove(s0, b.best); if (m) { viewPly = b.ply; show(false); board.setArrows([{ from: m.from, to: m.to, color: 'g' }]); say = { ...say, text: say.text + `<br><br>👀 The best move was <b>${esc(A.sanOf(s0, b.best))}</b>: ${esc(A.whatItDoes(s0, m))}.`, acts: [['retry', '↩️ Try it'], ['keep', 'Keep my move ▶']] }; bubble() } return }
    if (id === 'keep') { paused = false; viewPly = null; say = null; show(false); botTurn(); return }
    if (id === 'review') { go('review', G.id); return }
    if (id === 'rematch') { startGame({ mode: G.mode, oppId: G.oppId, oppRating: G.oppRating, color: G.my === 'w' ? 'b' : 'w', tc: G.tc ? G.tc.label : 'none' }); return }
    if (id === 'newbot') { go(coach ? 'coach' : 'bots'); return }
  }
  // ----- game over -----
  function finish(result, reason) {
    if (G.result) return;
    G.result = result; G.reason = reason; G.end = Date.now();
    const myScore = result === '1/2-1/2' ? .5 : (result === '1-0') === (G.my === 'w') ? 1 : 0;
    G.rated = G.mode === 'bot' && !G.takebacks && !G.hints && G.moves.length >= 4;
    let delta = 0;
    if (G.rated) {
      const K = D.games.filter(g => g.rated).length < 20 ? 40 : 24, exp = 1 / (1 + 10 ** ((G.oppRating - D.rating) / 400));
      delta = Math.round(K * (myScore - exp)); D.rating = Math.max(100, D.rating + delta); D.ratingHist.push([Date.now(), D.rating]);
    }
    G.delta = delta; G.myScore = myScore; G.ratingAfter = D.rating;
    const rec = { ...G, ev: G.ev }; D.games.unshift(rec); D.games = D.games.slice(0, 500);
    D.games.forEach((g, k) => { if (k >= 30 && g.ev) delete g.ev }); // keep storage small: old games keep their review summary
    save(true);
    snd.play(myScore === 1 ? 'win' : myScore === 0 ? 'lose' : 'draw');
    if (opp.voice && !coach && !(reason === 'resignation' && myScore === 1)) chat(line(opp, myScore === 1 ? 'lose' : myScore === 0 ? 'win' : 'draw') || 'Good game!');
    if (opp.face && !coach) setMood(myScore === 1 ? 'sad' : myScore === 0 ? 'happy' : 'smile');
    setTimeout(() => {
      if (!alive) return;
      const why = { checkmate: 'by checkmate', resignation: 'by resignation', timeout: 'on time', stalemate: 'by stalemate', repetition: 'by repetition', 'insufficient material': 'insufficient material', '50-move rule': '50-move rule', agreement: 'by agreement' }[reason] || reason;
      modal(`<div class="big">${myScore === 1 ? '🏆' : myScore === 0 ? '😔' : '🤝'}</div><h3>${myScore === 1 ? 'You Won!' : myScore === 0 ? `${esc(opp.name)} Won` : 'Draw'}</h3><div class="mute">${esc(why)}</div>
        ${G.rated ? `<div style="margin-top:.6rem;font-size:1.1rem"><b>${D.rating}</b> <span style="color:${delta >= 0 ? 'var(--acc)' : 'var(--bad)'}">${delta >= 0 ? '+' : ''}${delta}</span></div>` : `<div class="dim" style="margin-top:.5rem;font-size:.85rem">${coach ? 'Practice game (not rated)' : G.moves.length < 4 ? 'Too short to rate' : 'Not rated (hints or take-backs used)'}</div>`}
        <div class="row"><button class="btn" id="mRev">📊 Game Review</button></div><div class="row"><button class="btn sec" id="mRe">🔁 Rematch</button><button class="btn sec" id="mNew">New game</button></div>`,
        (o, close) => { $('#mRev', o).onclick = () => { close(); go('review', G.id) }; $('#mRe', o).onclick = () => { close(); act('rematch') }; $('#mNew', o).onclick = () => { close(); act('newbot') } });
    }, 500);
    D.cur = null; save(true);
    show(false);
  }
  // ----- clock -----
  clockT = setInterval(() => {
    if (!G.tc || over() || G.moves.length < 2) return;
    const col = S().turn, left = G.clock[col] - (Date.now() - turnStart);
    const el = document.querySelector(`[data-clk="${col}"]`);
    if (el) { el.textContent = fmtClock(left); el.classList.toggle('low', left < 20000) }
    if (col === G.my && left < 10000 && left > 0 && Math.floor(left / 1000) !== lastTick) { lastTick = Math.floor(left / 1000); snd.play('tick') }
    if (left <= 0) { G.clock[col] = 0; const winner = R.other(col); finish(R.canMate(S().board, winner) ? (winner === 'w' ? '1-0' : '0-1') : '1/2-1/2', 'timeout') }
  }, 100);
  // ----- start -----
  show(false);
  if (!G.moves.length) say = coach ? { who: 'opp', text: esc(lines.hi[0]) } : opp.voice && line(opp, 'hi') ? { who: 'opp', text: esc(line(opp, 'hi')) } : null;
  if (!coach && opp.voice) { mood = G._botEval != null ? moodFor(opp, G._botEval) : 'smile'; refreshFace() }
  bubble();
  if (!myTurn()) setTimeout(botTurn, 600); else if (coach) prepCoach();
  const onKey = e => { if (e.key === 'ArrowLeft') $('[data-nav="1"]').click(); if (e.key === 'ArrowRight') $('[data-nav="2"]').click() };
  addEventListener('keydown', onKey);
  return () => { alive = false; voice.stop(); clearInterval(clockT); clearTimeout(moodT); removeEventListener('keydown', onKey); clearQueue('coach'); clearQueue('bot') };
}

/* ---------- settings ---------- */
function settings() {
  const S = D.set;
  const draw = () => {
    const tog = (k, l, sub) => `<div class="set"><div><b>${l}</b>${sub ? `<small>${sub}</small>` : ''}</div><button class="tog ${S[k] ? 'on' : ''}" data-tog="${k}" aria-label="${l}"></button></div>`;
    const TH = { green: ['#ebecd0', '#739552'], brown: ['#f0d9b5', '#b58863'], blue: ['#dee3e6', '#8ca2ad'], purple: ['#efefef', '#8877b7'], gray: ['#e2e2e2', '#9a9a9a'], wood: ['#e8c99b', '#a8733f'], night: ['#7a8aa5', '#3b4660'], coral: ['#f2e6d6', '#d48a6e'] };
    app.innerHTML = `${top('Settings')}<div class="page">
      <h2>Board</h2><div class="themes">${Object.entries(TH).map(([k, [a, b]]) => `<button class="thb ${S.theme === k ? 'on' : ''}" data-th="${k}" aria-label="${k}"><i style="background:${a}"></i><i style="background:${b}"></i><i style="background:${b}"></i><i style="background:${a}"></i></button>`).join('')}</div>
      <h2>Pieces</h2><div class="themes">${Object.entries(SETS).map(([k, v]) => `<button class="pset ${S.pieces === k ? 'on' : ''}" data-ps="${k}" aria-label="${v.name}">${pieceSVG('N', k)}</button>`).join('')}</div>
      <div class="card" style="margin-top:1rem;padding:.2rem .9rem">
        ${tog('sound', 'Sounds')}${tog('anim', 'Slide pieces')}${tog('dots', 'Show legal moves')}${tog('coords', 'Coordinates')}${tog('premove', 'Premoves', 'Make your next move while the bot is thinking')}${tog('autoQ', 'Always promote to queen')}
      </div>
      <h2>Voices</h2><div class="card" style="padding:.2rem .9rem">
        ${tog('voice', 'Voices', 'Opponents and coaches talk out loud')}${tog('accents', 'Accents', 'People sound like they’re from their country')}
        <div class="set"><div><b>Voice type</b></div></div>
        <div class="seg" style="margin:-.3rem 0 .6rem">${[['builtin', '📱 Built-in'], ['azure', '✨ Natural (Azure)']].map(([k, l]) => `<button class="${(S.engine || 'builtin') === k ? 'on' : ''}" data-eng="${k}">${l}</button>`).join('')}</div>
        ${S.engine === 'azure' ? (() => { const st = voice.azureStatus(), u = voice.usage(), pct = Math.min(100, u.chars / st.limit * 100); return `
        <label class="fld"><span>Azure key</span><input id="azk" type="password" autocomplete="off" placeholder="Paste KEY 1 here" value="${esc(S.azKey || '')}"></label>
        <label class="fld"><span>Region</span><input id="azr" autocomplete="off" placeholder="eastus" value="${esc(S.azRegion || '')}"></label>
        <div style="display:flex;gap:.5rem;align-items:center;margin:.4rem 0"><button class="btn sm" id="azc">🔌 Connect</button><span class="mute" style="font-size:.82rem" id="azs">${st.ok ? `✅ Connected · ${st.voices} voices` : st.err ? `⚠️ ${esc(st.err)}` : 'Not connected yet'}</span></div>
        <div class="mute" style="font-size:.8rem;margin-top:.4rem">This month: <b>${u.chars.toLocaleString()}</b> of 500,000 free characters</div><div class="pbarw"><i style="width:${pct}%"></i></div>
        <p class="mute" style="font-size:.78rem;margin:.3rem 0 .4rem">Your key stays on this device only and isn’t included in backups. Lines that repeat are saved, so they’re free after the first time. If you’re offline or the month runs out, the built-in voices take over.</p>` })() : `<p class="mute" style="font-size:.8rem;margin:.2rem 0 .4rem">Free, built into your phone, and works offline. For better built-in voices on iPhone: <b>Settings → Accessibility → Spoken Content → Voices → English</b>, and download voices marked <b>Enhanced</b> or <b>Premium</b>.</p>`}
        <div class="set"><div><b>Test it</b><small>Hear a random opponent</small></div><button class="btn sm sec" id="vtest">🔊 Play</button></div>
      </div>
      <h2>Your data</h2><div class="card"><p class="mute" style="margin:0 0 .6rem;font-size:.88rem">Everything is saved on this device. Make a backup now and then so you never lose your games and rating.</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn sm" id="exp">💾 Save backup</button><button class="btn sm sec" id="imp">📂 Load backup</button><button class="btn sm red" id="reset">Reset everything</button></div><input type="file" id="file" accept=".json" hidden></div></div>`;
    bindGo();
    app.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => { S[b.dataset.tog] = !S[b.dataset.tog]; snd.setSound(S.sound); voice.setVoice({ on: S.voice, accents: S.accents }); save(); draw() });
    app.querySelectorAll('[data-eng]').forEach(b => b.onclick = () => { S.engine = b.dataset.eng; voice.setVoice({ engine: S.engine }); save(); draw() });
    const azSave = () => { S.azKey = $('#azk').value.trim(); S.azRegion = $('#azr').value.trim().toLowerCase().replace(/\s+/g, ''); voice.setVoice({ azKey: S.azKey, azRegion: S.azRegion }); save() };
    if ($('#azk')) { $('#azk').onchange = azSave; $('#azr').onchange = azSave }
    if ($('#azc')) $('#azc').onclick = async () => {
      azSave(); const st = $('#azs');
      if (!S.azKey || !S.azRegion) { st.textContent = '⚠️ Paste your key and region first'; return }
      st.textContent = 'Connecting…';
      try { const n = await voice.azureConnect(S.azKey, S.azRegion); st.textContent = `✅ Connected · ${n} voices`; toast('Natural voices are on ✅'); const p = botById('rosa'); voice.say(`Ciao! It's Grandma Rosa. Now I sound like a real person!`, p, { mood: 'happy' }) }
      catch (e) { st.textContent = '⚠️ ' + e.message }
    };
    if ($('#vtest')) $('#vtest').onclick = () => { const p = pick(BOTS.filter(b => !b.engine)); voice.say(`Hi, I'm ${p.name}${p.from ? ` from ${p.from.split(',').pop().trim()}` : ''}. ${line(p, 'hi')}`, p) };
    app.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { S.theme = b.dataset.th; document.body.className = themeClass(); save(); draw() });
    app.querySelectorAll('[data-ps]').forEach(b => b.onclick = () => { S.pieces = b.dataset.ps; save(); draw() });
    $('#exp').onclick = () => { const a = document.createElement('a'); const out = { ...D, set: { ...D.set, azKey: '' } }; a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })); a.download = `chess-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click() };
    $('#imp').onclick = () => $('#file').click();
    $('#file').onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); if (!d.set || !Array.isArray(d.games)) throw 0; const keep = { azKey: D.set.azKey, azRegion: D.set.azRegion }; Object.keys(D).forEach(k => delete D[k]); Object.assign(D, d); D.set = { ...D.set, azKey: keep.azKey || d.set.azKey || '', azRegion: d.set.azRegion || keep.azRegion }; save(true); toast('Backup loaded ✅'); go('home') } catch (err) { toast('That file isn’t a chess backup') } };
    $('#reset').onclick = e => { if (!e.target._sure) { e.target._sure = 1; e.target.textContent = 'Tap again: delete all'; return } localStorage.removeItem(KEY); location.reload() };
  };
  draw();
}
document.body.className = themeClass();
addEventListener('pointerdown', () => snd.unlock(), { once: true });
go(D.cur && !D.cur.result ? 'home' : 'home');
