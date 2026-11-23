// Game Review (like chess.com), game history, stats.
import * as R from './rules.js';
import { analyse, clearQueue } from './engine.js';
import * as A from './analysis.js';
import { openingName } from './openings.js';
import * as snd from './sound.js';

const COACH = { name: 'Coach', emoji: '🎓', color: '#8e44ad' };
const RES = (g) => g.result === '1/2-1/2' ? ['d', 'Draw'] : (g.result === '1-0') === (g.my === 'w') ? ['w', 'Win'] : ['l', 'Loss'];
const when = t => { const d = new Date(t), now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) };

export function reviewView(ctx, id) {
  const { D, save, $, esc, av, ME, botById, top, bindGo, app, newBoard, capturedHTML, gameData } = ctx;
  const G = D.games.find(g => g.id === id); if (!G) { ctx.go('history'); return }
  const opp = botById(G.oppId) || { name: 'Bot', emoji: '🤖', color: '#555' }, gd = gameData(G.moves), n = gd.sans.length;
  G.ev = G.ev || {};
  // reviewing an old game brings it back to the front of the analysis cache
  D.games.forEach(g => { if (g !== G && g.ev && D.games.indexOf(g) >= 30) delete g.ev });
  let cur = 0, grades = null, alive = true, retry = null, showBest = false;
  app.innerHTML = `${top('📊 Game Review', 'history', `<button class="iconbtn" id="flipB" aria-label="Flip board">⇅</button>`)}
    <div class="game"><div class="gcol"><div class="pbar" id="topBar"></div><div class="gboard" style="padding-left:4.2%"><div id="bd"></div><div class="evbar" id="evb" style="left:0"><i></i><b></b></div></div><div class="pbar" id="botBar"></div></div>
    <div class="side"><div id="sum"></div><div class="graph" id="graph"></div><div id="say"></div><div class="moves" id="mv"></div><div class="nav" id="nav"></div><div class="ctrl" id="ctrl"></div></div></div>`;
  bindGo();
  const board = newBoard($('#bd')); if (G.my === 'b') board.flip('b');
  $('#flipB').onclick = () => board.flip();
  const evOf = ply => G.ev[ply];
  const whiteWp = ply => { const e = evOf(ply); if (!e) return null; if (!e.lines || !e.lines.length) { const s = gd.states[ply]; return R.inCheck(s, s.turn) ? (s.turn === 'w' ? 0 : 100) : 50 } const w = A.winP(e.lines[0].cp); return gd.states[ply].turn === 'w' ? w : 100 - w };
  // ----- run the analysis -----
  async function run() {
    for (let p = 0; p <= n && alive; p++) {
      if (G.ev[p] && G.ev[p].depth >= 13) continue;
      const s = gd.states[p];
      if (!R.legalMoves(s).length) { G.ev[p] = { best: null, depth: 99, lines: [] }; continue }
      const r = await analyse(R.toFEN(s), { depth: 14, multipv: 2, tag: 'review' });
      if (!alive) return; if (r.cancelled) return;
      G.ev[p] = { best: r.best, depth: r.depth, lines: r.lines.slice(0, 2).map(l => ({ uci: l.uci, cp: l.cp, mate: l.mate })) };
      if (p % 4 === 0) { save(); summary() }
    }
    finishUp();
  }
  function finishUp() {
    grades = A.gradeGame(gd, G.ev);
    const accW = A.accuracy(grades, 'w'), accB = A.accuracy(grades, 'b');
    const myAcc = G.my === 'w' ? accW : accB, oppAcc = G.my === 'w' ? accB : accW;
    G.review = {
      accMe: myAcc, accOpp: oppAcc, estMe: A.estRating(myAcc, G.oppRating, n), estOpp: A.estRating(oppAcc, null, n),
      counts: countLabels(), mist: grades.map((g, i) => g && (i % 2 === 0) === (G.my === 'w') && ['mistake', 'blunder', 'miss'].includes(g.label) ? { ply: i, best: g.best } : null).filter(Boolean),
      opening: (openingName(gd.sans) || {}).name || null,
    };
    save(true); summary(); show();
  }
  function countLabels() {
    const c = { w: {}, b: {} };
    (grades || []).forEach((g, i) => { if (g) { const col = i % 2 ? 'b' : 'w'; c[col][g.label] = (c[col][g.label] || 0) + 1 } });
    return c;
  }
  // ----- drawing -----
  function summary() {
    const done = Object.keys(G.ev).filter(k => G.ev[k]).length;
    if (!grades) { $('#sum').innerHTML = `<div class="card"><b>🔎 Reviewing your game…</b><div class="progress" style="margin:.6rem 0 .3rem"><i style="width:${Math.round(done / (n + 1) * 100)}%"></i></div><div class="dim" style="font-size:.82rem">Stockfish is checking every move (${done}/${n + 1}). You can look around meanwhile.</div></div>`; graph(); return }
    const rv = G.review, c = rv.counts, me = G.my, op = me === 'w' ? 'b' : 'w';
    $('#sum').innerHTML = `<div class="accs"><div><span>You</span><b>${rv.accMe != null ? rv.accMe.toFixed(1) : '–'}</b><span>accuracy</span></div><div><span>${esc(opp.name)}</span><b>${rv.accOpp != null ? rv.accOpp.toFixed(1) : '–'}</b><span>accuracy</span></div></div>
      <div class="card" style="margin-top:.5rem;padding:.6rem .8rem"><div class="sum"><span></span><span class="h">You</span><span class="h">${esc(opp.name)}</span>
      ${A.LABEL_ORDER.map(k => `<span class="lb"><i style="background:${A.LABELS[k].c}">${A.LABELS[k].g.length > 2 ? '' : A.LABELS[k].g}</i>${A.LABELS[k].n}</span><span class="v" style="color:${A.LABELS[k].c}">${c[me][k] || 0}</span><span class="v" style="color:${A.LABELS[k].c}">${c[op][k] || 0}</span>`).join('')}
      <span class="lb" style="margin-top:.3rem"><b>Game rating</b></span><span class="v" style="margin-top:.3rem">${rv.estMe || '–'}</span><span class="v" style="margin-top:.3rem">${rv.estOpp || '–'}</span></div>
      ${rv.opening ? `<div class="dim" style="font-size:.82rem;margin-top:.5rem">📖 ${esc(rv.opening)}</div>` : ''}</div>`;
    graph();
  }
  function graph() {
    const W = 600, H = 100, pts = []; for (let p = 0; p <= n; p++) { const w = whiteWp(p); if (w != null) pts.push([p / Math.max(1, n) * W, H - w / 100 * H]) }
    let dots = '';
    if (grades) grades.forEach((g, i) => { if (g && ['brilliant', 'great', 'blunder', 'mistake', 'miss'].includes(g.label)) { const w = whiteWp(i + 1); if (w != null) dots += `<circle cx="${(i + 1) / n * W}" cy="${H - w / 100 * H}" r="4" fill="${A.LABELS[g.label].c}" stroke="#fff" stroke-width="1.2"/>` } });
    const area = pts.length ? `M0,${H} ${pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} L${pts[pts.length - 1][0]},${H} Z` : '';
    const cx = cur / Math.max(1, n) * W;
    $('#graph').innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><rect width="${W}" height="${H}" fill="#403d39"/><path d="${area}" fill="#fff"/><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#888" stroke-width=".8" stroke-dasharray="3 3"/><line x1="${cx}" y1="0" x2="${cx}" y2="${H}" stroke="#81b64c" stroke-width="2"/>${dots}</svg>`;
    $('#graph').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); cur = Math.round((e.clientX - r.left) / r.width * n); retry = null; showBest = false; show() };
  }
  function bars() {
    const s = gd.states[cur], oc = G.my === 'w' ? 'b' : 'w';
    $('#topBar').innerHTML = `${av(opp)}<div class="nm"><b>${esc(opp.name)}</b><span class="rt">(${G.oppRating})</span><div class="caps">${capturedHTML(s, oc)}</div></div>`;
    $('#botBar').innerHTML = `${av(ME)}<div class="nm"><b>You</b><div class="caps">${capturedHTML(s, G.my)}</div></div>`;
  }
  function evbar() {
    const e = evOf(cur), el = $('#evb'); if (!e) { el.querySelector('i').style.height = '50%'; el.querySelector('b').textContent = ''; return }
    const s = gd.states[cur], l = e.lines && e.lines[0]; let txt, wp;
    if (!l) { const mated = R.inCheck(s, s.turn); wp = mated ? (s.turn === 'w' ? 0 : 100) : 50; txt = mated ? '#' : '½' }
    else { const cpW = s.turn === 'w' ? l.cp : -l.cp; wp = A.winP(cpW); txt = l.mate != null ? `M${Math.abs(l.mate)}` : (Math.abs(cpW) / 100).toFixed(1) }
    const flip = board.orientation === 'b';
    el.querySelector('i').style.height = (flip ? 100 - wp : wp) + '%';
    el.querySelector('i').style.background = flip ? '#403d39' : '#fff'; el.style.background = flip ? '#fff' : '#403d39';
    const b = el.querySelector('b'); b.textContent = txt; const whiteUp = wp >= 50;
    b.style.cssText = (whiteUp !== flip ? 'bottom:.3rem;color:#333' : 'top:.3rem;color:#eee');
  }
  function words(i) { // coach text for move i
    const g = grades && grades[i]; if (!g) return '<span class="dim">Still analyzing this move…</span>';
    const s = gd.states[i], m = gd.moves[i], san = gd.sans[i], mine = (i % 2 === 0) === (G.my === 'w'), who = mine ? 'You' : opp.name;
    const bestSan = A.sanOf(s, g.best), bm = R.uciToMove(s, g.best);
    switch (g.label) {
      case 'brilliant': return `<b>${esc(san)}</b> is brilliant! ${esc(cap(A.whatItDoes(s, m)))}, even though it gives up material.`;
      case 'great': return `<b>${esc(san)}</b> is a great move. It was the only move that kept ${mine ? 'your' : 'their'} position together: ${esc(A.whatItDoes(s, m))}.`;
      case 'best': return `<b>${esc(san)}</b> is the best move. ${esc(cap(A.whatItDoes(s, m)))}.`;
      case 'book': { const op = openingName(gd.sans.slice(0, i + 1)); return `<b>${esc(san)}</b> is a book move${op ? ` in the <b>${esc(op.name)}</b>` : ''}. This has been played by strong players many times.` }
      case 'excellent': case 'good': return `<b>${esc(san)}</b> is ${g.label === 'excellent' ? 'an excellent' : 'a good'} move. ${bestSan && bestSan !== san ? `The best was <b>${esc(bestSan)}</b>: ${esc(A.whatItDoes(s, bm))}.` : ''}`;
      default: {
        const base = mine ? A.explainMistake(gd, i, G.ev, opp.name) : A.explainMistake(gd, i, G.ev, 'you').replace(/your /g, 'their ').replace(/^(.*?)lets you checkmate you/, '$1lets you checkmate them');
        return `${g.label === 'miss' ? `${mine ? 'You' : esc(opp.name)} missed a chance here. ` : ''}${esc(base)}`;
      }
    }
  }
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  function moveList() {
    let h = '';
    for (let i = 0; i < n; i += 2) {
      h += `<span class="n">${i / 2 + 1}.</span>`;
      for (const k of [i, i + 1]) {
        if (k >= n) { h += '<span></span>'; continue }
        const g = grades && grades[k], L = g && A.LABELS[g.label], show = L && !['best', 'excellent', 'good'].includes(g.label);
        h += `<span class="mv ${cur === k + 1 ? 'on' : ''}" data-ply="${k + 1}">${show ? `<span class="gl" style="background:${L.c}">${L.g.length > 2 ? '' : L.g}</span>` : ''}${esc(gd.sans[k])}</span>`;
      }
    }
    $('#mv').innerHTML = h;
    $('#mv').querySelectorAll('[data-ply]').forEach(e => e.onclick = () => { cur = +e.dataset.ply; retry = null; showBest = false; show() });
    const on = $('#mv .on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  const keyMoves = () => grades ? grades.map((g, i) => g && ['brilliant', 'great', 'miss', 'mistake', 'blunder'].includes(g.label) ? i + 1 : null).filter(Boolean) : [];
  function show(animate = true) {
    const s = gd.states[cur], i = cur - 1, g = grades && i >= 0 ? grades[i] : null;
    board.setPosition(retry ? retry.s : s, { animate, last: retry ? retry.last : (i >= 0 ? gd.moves[i] : null) });
    board.setInteractive(retry && !retry.done ? retry.col : null, onRetryMove);
    board.setBadges(!retry && g ? [{ sq: gd.moves[i].to, color: A.LABELS[g.label].c, html: A.LABELS[g.label].g.length > 2 ? A.LABELS[g.label].g.slice(0, 2) : A.LABELS[g.label].g }] : []);
    const arrows = [];
    if (!retry && g && (showBest || !['best', 'brilliant', 'great', 'book'].includes(g.label)) && g.best) { const bm = R.uciToMove(gd.states[i], g.best); if (bm && R.moveToUci(gd.moves[i]) !== g.best) arrows.push({ from: bm.from, to: bm.to, color: 'g', opacity: .75 }) }
    board.setArrows(arrows);
    bars(); evbar(); moveList(); graph();
    // coach bubble
    let text, acts = [];
    if (retry) text = retry.msg;
    else if (cur === 0) text = grades ? `Let’s go through your game! ${G.review.accMe != null ? `You played with <b>${G.review.accMe.toFixed(1)}%</b> accuracy` : ''}${G.review.estMe ? `, like a <b>${G.review.estMe}</b>-rated player this game.` : '.'} Tap <b>Next key move</b> to jump to the important moments.` : 'Hang on while I look at the game…';
    else text = `${g ? `<b class="lbl" style="color:${A.LABELS[g.label].c}">${A.LABELS[g.label].g} ${A.LABELS[g.label].n}</b><br>` : ''}${words(i)}`;
    const mine = i >= 0 && (i % 2 === 0) === (G.my === 'w');
    if (!retry && g && mine && A.BAD.has(g.label)) acts.push(['retry', '↩️ Retry'], ['best', '👀 Best move']);
    if (retry && !retry.done) acts.push(['giveup', 'Show answer']);
    if (retry && retry.done) acts.push(['back', 'Back to review']);
    $('#say').innerHTML = `<div class="bubble">${ctx.av(COACH)}<div class="txt">${text}${acts.length ? `<div class="acts">${acts.map(([k, l]) => `<button class="btn sm sec" data-ra="${k}">${l}</button>`).join('')}</div>` : ''}</div></div>`;
    $('#say').querySelectorAll('[data-ra]').forEach(b => b.onclick = () => ra(b.dataset.ra));
    $('#nav').innerHTML = `<button data-n="0">⏮</button><button data-n="1">◀</button><button data-n="2">▶</button><button data-n="3">⏭</button>`;
    $('#nav').querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const k = +b.dataset.n; cur = k === 0 ? 0 : k === 1 ? Math.max(0, cur - 1) : k === 2 ? Math.min(n, cur + 1) : n; retry = null; showBest = false; if (k === 2 && cur > 0) moveSound(cur - 1); show() });
    const km = keyMoves(), nextKey = km.find(p => p > cur);
    $('#ctrl').innerHTML = `<button id="nk" ${nextKey ? '' : 'disabled'}><i>⏩</i>Next key move</button><button id="rm"><i>🔁</i>Rematch</button><button id="hm"><i>🏠</i>Home</button>`;
    $('#nk').onclick = () => { if (nextKey) { cur = nextKey; retry = null; showBest = false; moveSound(cur - 1); show() } };
    $('#rm').onclick = () => ctx.startGame({ mode: G.mode, oppId: G.oppId, oppRating: G.oppRating, color: G.my === 'w' ? 'b' : 'w', tc: G.tc ? G.tc.label : 'none' });
    $('#hm').onclick = () => ctx.go('home');
  }
  function moveSound(i) { const m = gd.moves[i], ns = gd.states[i + 1]; snd.play(R.inCheck(ns, ns.turn) ? 'check' : m.captured ? 'capture' : 'move') }
  function ra(k) {
    const i = cur - 1;
    if (k === 'best') { showBest = true; show(false); return }
    if (k === 'retry') { retry = { s: gd.states[i], col: gd.states[i].turn, last: i > 0 ? gd.moves[i - 1] : null, i, msg: `Find a better move than <b>${esc(gd.sans[i])}</b>. Take your time!`, done: false, tries: 0 }; show(false); return }
    if (k === 'giveup') { const g = grades[i], bm = R.uciToMove(gd.states[i], g.best); retry.done = true; retry.msg = `The best move was <b>${esc(A.sanOf(gd.states[i], g.best))}</b>: ${esc(A.whatItDoes(gd.states[i], bm))}.`; show(false); board.setArrows([{ from: bm.from, to: bm.to, color: 'g' }]); return }
    if (k === 'back') { retry = null; show(false) }
  }
  async function onRetryMove(m) {
    const rt = retry; if (!rt) return;
    const ns = R.makeMove(rt.s, m); rt.tries++;
    rt.s = ns; rt.last = m; rt.done = true; rt.msg = '<span class="dim">Checking…</span>'; show(true);
    const g = grades[rt.i], uci = R.moveToUci(m);
    let ok = uci === g.best;
    if (!ok) { const r = await analyse(R.toFEN(ns), { depth: 13, tag: 'retry' }); const after = r.lines[0] ? -r.lines[0].cp : (R.inCheck(ns, ns.turn) ? 100000 : 0); ok = A.winP(g.bestCp) - A.winP(after) < 4 }
    if (retry !== rt) return;
    if (ok) { snd.play('good'); rt.msg = `✅ <b>Nice!</b> ${esc(R.toSAN(gd.states[rt.i], m))} works: ${esc(A.whatItDoes(gd.states[rt.i], m))}.` }
    else { snd.play('bad'); rt.s = gd.states[rt.i]; rt.last = rt.i > 0 ? gd.moves[rt.i - 1] : null; rt.done = false; rt.msg = `❌ Not quite, that's still not good enough. Try again!`; }
    show(false);
  }
  show(false); summary();
  const missing = []; for (let p = 0; p <= n; p++) if (!G.ev[p] || G.ev[p].depth < 13) missing.push(p);
  if (missing.length) run(); else finishUp();
  const onKey = e => { if (e.key === 'ArrowLeft') $('[data-n="1"]').click(); if (e.key === 'ArrowRight') $('[data-n="2"]').click() };
  addEventListener('keydown', onKey);
  return () => { alive = false; clearQueue('review'); removeEventListener('keydown', onKey); save(true) };
}

function ratingSVG(hist, color = '#81b64c') {
  if (hist.length < 2) return '<div class="dim center" style="padding:1.4rem 0;font-size:.85rem">Play a few rated games to see your rating graph.</div>';
  const ys = hist.map(h => h[1]), lo = Math.min(...ys) - 20, hi = Math.max(...ys) + 20, W = 600, H = 120;
  const pts = hist.map((h, i) => [i / (hist.length - 1) * W, H - (h[1] - lo) / (hi - lo) * H]);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="M0,${H} ${pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} L${W},${H}Z" fill="${color}" opacity=".18"/><path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/></svg>`;
}
export function historyView(ctx) {
  const { D, esc, av, botById, top, bindGo, app } = ctx;
  const games = D.games.filter(g => g.result && g.result !== '*');
  app.innerHTML = `${top('📜 Game History')}<div class="page">
    <div class="card rgraph"><div style="display:flex;justify-content:space-between"><b>Rating ${D.rating}</b><span class="dim">${D.ratingHist.length} rated games</span></div>${ratingSVG([[0, 800], ...D.ratingHist])}</div>
    <h2>Games</h2><div class="hist">${games.length ? games.map(g => { const o = botById(g.oppId) || { emoji: '🤖', color: '#555', name: 'Bot' }, [rc, rt] = RES(g); return `<button class="hi" data-g="${g.id}">${av(o)}<div class="g"><b>${esc(o.name)}</b> <span class="dim">(${g.oppRating})</span><div>${g.mode === 'coach' ? '🎓 Lesson · ' : ''}${Math.ceil(g.moves.length / 2)} moves · ${esc(g.reason || '')} · ${when(g.end || g.start)}${g.review && g.review.accMe != null ? ` · 🎯 ${g.review.accMe.toFixed(0)}%` : ''}</div></div><span class="res ${rc}">${rt}${g.rated && g.delta != null ? ` ${g.delta >= 0 ? '+' : ''}${g.delta}` : ''}</span></button>` }).join('') : '<div class="card dim center">No games yet. Go play one!</div>'}</div></div>`;
  bindGo();
  app.querySelectorAll('[data-g]').forEach(b => b.onclick = () => ctx.go('review', b.dataset.g));
}
export function statsView(ctx) {
  const { D, esc, top, bindGo, app, botById } = ctx;
  const games = D.games.filter(g => g.result && g.result !== '*'), rated = games.filter(g => g.rated);
  const w = games.filter(g => RES(g)[0] === 'w').length, l = games.filter(g => RES(g)[0] === 'l').length, d = games.length - w - l;
  const reviewed = games.filter(g => g.review && g.review.accMe != null), avgAcc = reviewed.length ? reviewed.reduce((a, g) => a + g.review.accMe, 0) / reviewed.length : null;
  const best = games.filter(g => RES(g)[0] === 'w').sort((a, b) => b.oppRating - a.oppRating)[0];
  const ops = {}; games.forEach(g => { const o = (openingName(ctx.gameData(g.moves.slice(0, 16)).sans) || {}).name; if (!o) return; const k = o.split(':')[0]; ops[k] = ops[k] || { n: 0, w: 0 }; ops[k].n++; if (RES(g)[0] === 'w') ops[k].w++ });
  const topOps = Object.entries(ops).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  const peak = Math.max(D.rating, ...D.ratingHist.map(h => h[1]));
  app.innerHTML = `${top('📈 Stats')}<div class="page">
    <div class="accs"><div><span>Rating</span><b>${D.rating}</b><span>best ${peak}</span></div><div><span>Puzzles</span><b>${D.puzRating}</b><span>rush best ${D.rushBest || 0}</span></div></div>
    <div class="card rgraph" style="margin-top:.6rem"><b>Game rating</b>${ratingSVG([[0, 800], ...D.ratingHist])}</div>
    <div class="card rgraph" style="margin-top:.6rem"><b>Puzzle rating</b>${ratingSVG([[0, 800], ...D.puzHist], '#5c8bb0')}</div>
    <h2>Record</h2><div class="accs"><div><b style="color:var(--acc)">${w}</b><span>wins</span></div><div><b>${d}</b><span>draws</span></div><div><b style="color:var(--bad)">${l}</b><span>losses</span></div></div>
    <h2>Highlights</h2><div class="card" style="font-size:.92rem;line-height:1.8">
      🎯 Average accuracy: <b>${avgAcc != null ? avgAcc.toFixed(1) + '%' : 'review a game to see'}</b><br>
      🏆 Best win: <b>${best ? `${esc((botById(best.oppId) || {}).name || 'Bot')} (${best.oppRating})` : 'none yet'}</b><br>
      🎮 Rated games: <b>${rated.length}</b> · lessons: <b>${games.filter(g => g.mode === 'coach').length}</b><br>
      🧩 Puzzles solved: <b>${Object.values(D.solved).filter(v => v === 1).length}</b></div>
    ${topOps.length ? `<h2>Your openings</h2><div class="card">${topOps.map(([k, v]) => `<div class="set"><div><b>${esc(k)}</b><small>${v.n} game${v.n > 1 ? 's' : ''}</small></div><b>${Math.round(v.w / v.n * 100)}% wins</b></div>`).join('')}</div>` : ''}
  </div>`;
  bindGo();
}
