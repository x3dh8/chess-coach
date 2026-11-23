// The chess board: pieces slide between squares, drag or tap to move, arrows, marks, premoves.
import * as R from './rules.js';
import { pieceSVG } from './pieces.js';

export function createBoard(root, opts = {}) {
  root.classList.add('bd');
  root.innerHTML = `<div class="bd-sq"></div><div class="bd-pcs"></div><svg class="bd-arw" viewBox="0 0 800 800"><defs>
    ${['g', 'o', 'b', 'r', 'y'].map(c => `<marker id="ah-${c}" markerWidth="4" markerHeight="4" refX="2.05" refY="2" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4z" class="ah-${c}"/></marker>`).join('')}</defs><g></g></svg><div class="bd-badges"></div><div class="bd-promo" hidden></div>`;
  const sqEl = root.querySelector('.bd-sq'), pcsEl = root.querySelector('.bd-pcs'), arwG = root.querySelector('.bd-arw g'), badgeEl = root.querySelector('.bd-badges'), promoEl = root.querySelector('.bd-promo');
  let orient = 'w', state = null, pieces = [], nid = 0, set = opts.pieceSet || 'classic';
  let sel = null, legal = [], interactive = null, onMove = null, premoveOn = false, premove = null, autoQueen = false, showDots = true, showCoords = true;
  let hl = {}, userMarks = new Set(), userArrows = [], appArrows = [], drag = null, animMs = 180;
  const squares = [];
  for (let i = 0; i < 64; i++) { const d = document.createElement('div'); d.className = 'sq'; sqEl.appendChild(d); squares.push(d) }
  // board coords: view index (0 = top-left as shown) <-> square index
  const vi = sq => orient === 'w' ? sq : 63 - sq;
  const xy = sq => { const v = vi(sq); return [v & 7, v >> 3] };
  function paintSquares() {
    for (let sq = 0; sq < 64; sq++) {
      const v = vi(sq), d = squares[v], r = sq >> 3, c = sq & 7;
      d.className = 'sq ' + (((r + c) & 1) ? 'dk' : 'lt');
      const cls = hl[sq]; if (cls) d.className += ' ' + cls;
      if (sel === sq) d.className += ' sel';
      if (premove && (premove.from === sq || premove.to === sq)) d.className += ' pre';
      if (userMarks.has(sq)) d.className += ' mark';
      let inner = '';
      if (showCoords) {
        if ((v & 7) === 0) inner += `<span class="co r">${8 - r}</span>`;
        if ((v >> 3) === 7) inner += `<span class="co f">${'abcdefgh'[c]}</span>`;
      }
      if (sel != null && showDots) { const m = legal.find(x => x.from === sel && x.to === sq); if (m) inner += `<i class="${state && state.board[sq] || m.flag === 'ep' ? 'cap' : 'dot'}"></i>` }
      if (d._inner !== inner) { d.innerHTML = inner; d._inner = inner }
    }
  }
  function place(p, animate) {
    const [x, y] = xy(p.sq);
    p.el.style.transition = animate ? `transform ${animMs}ms ease` : 'none';
    p.el.style.transform = `translate(${x * 100}%,${y * 100}%)`;
  }
  function makePiece(code, sq) { const el = document.createElement('div'); el.className = 'pc'; el.innerHTML = pieceSVG(code, set); pcsEl.appendChild(el); const p = { id: ++nid, p: code, sq, el }; place(p, false); return p }
  // Show a position. Pieces are matched to their old spots so they slide instead of jumping.
  function setPosition(s, { animate = true, last = null, check = true } = {}) {
    const old = pieces; pieces = [];
    const want = []; s.board.forEach((p, sq) => { if (p) want.push({ p, sq }) });
    const left = old.slice(), todo = [];
    for (const w of want) { const k = left.findIndex(o => o.p === w.p && o.sq === w.sq); if (k >= 0) { pieces.push(left.splice(k, 1)[0]) } else todo.push(w) }
    for (const w of todo) {
      let bi = -1, bd = 99;
      left.forEach((o, k) => { if (o.p !== w.p) return; const d = Math.max(Math.abs((o.sq & 7) - (w.sq & 7)), Math.abs((o.sq >> 3) - (w.sq >> 3))); if (d < bd) { bd = d; bi = k } });
      // a pawn that reached the last rank becomes the new piece
      if (bi < 0 && last && last.promo && w.sq === last.to) bi = left.findIndex(o => o.sq === last.from);
      if (bi >= 0) { const o = left.splice(bi, 1)[0]; if (o.p !== w.p) { o.p = w.p; o.el.innerHTML = pieceSVG(w.p, set) } o.sq = w.sq; place(o, animate); pieces.push(o) }
      else { const np = makePiece(w.p, w.sq); if (animate) { np.el.style.opacity = 0; requestAnimationFrame(() => { np.el.style.transition = `opacity ${animMs}ms`; np.el.style.opacity = 1 }) } pieces.push(np) }
    }
    for (const o of left) { if (animate) { o.el.style.transition = `opacity ${animMs}ms`; o.el.style.opacity = 0; setTimeout(() => o.el.remove(), animMs + 20) } else o.el.remove() }
    state = s;
    hl = {};
    if (last) { hl[last.from] = 'last'; hl[last.to] = 'last' }
    if (check && R.inCheck(s, s.turn)) hl[R.findKing(s.board, s.turn)] = (hl[R.findKing(s.board, s.turn)] || '') + ' check';
    if (sel != null && (!s.board[sel] || R.colorOf(s.board[sel]) !== interactive)) sel = null;
    legal = interactive && s.turn === interactive ? R.legalMoves(s) : [];
    paintSquares(); drawArrows();
  }
  function flip(o) { orient = o || (orient === 'w' ? 'b' : 'w'); pieces.forEach(p => place(p, false)); paintSquares(); drawArrows(); drawBadges() }
  // ----- arrows -----
  function arrowSVG(a) {
    const [x1, y1] = xy(a.from), [x2, y2] = xy(a.to), c = a.color || 'g';
    const sx = x1 * 100 + 50, sy = y1 * 100 + 50, ex = x2 * 100 + 50, ey = y2 * 100 + 50;
    const dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const knight = Math.abs(x1 - x2) * Math.abs(y1 - y2) === 2;
    const op = a.opacity != null ? a.opacity : .8, w = a.width || 15;
    if (knight) { // L-shaped like chess.com
      const mx = Math.abs(dx) > Math.abs(dy) ? ex : sx, my = Math.abs(dx) > Math.abs(dy) ? sy : ey;
      return `<path d="M${sx},${sy} L${mx},${my} L${ex - (ex - mx ? Math.sign(ex - mx) : 0) * 32},${ey - (ey - my ? Math.sign(ey - my) : 0) * 32}" class="aw aw-${c}" stroke-width="${w}" opacity="${op}" fill="none" marker-end="url(#ah-${c})"/>`;
    }
    return `<line x1="${sx + ux * 18}" y1="${sy + uy * 18}" x2="${ex - ux * 32}" y2="${ey - uy * 32}" class="aw aw-${c}" stroke-width="${w}" opacity="${op}" marker-end="url(#ah-${c})"/>`;
  }
  function drawArrows() { arwG.innerHTML = appArrows.concat(userArrows).map(arrowSVG).join('') }
  // ----- badges (Game Review icons on squares) -----
  let badges = [];
  function drawBadges() { badgeEl.innerHTML = badges.map(b => { const [x, y] = xy(b.sq); return `<div class="bdg" style="left:${(x + 1) * 12.5}%;top:${y * 12.5}%;background:${b.color}">${b.html}</div>` }).join('') }
  // ----- input -----
  const sqAt = (cx, cy) => { const r = root.getBoundingClientRect(), x = Math.floor((cx - r.left) / r.width * 8), y = Math.floor((cy - r.top) / r.height * 8); if (x < 0 || x > 7 || y < 0 || y > 7) return null; const v = y * 8 + x; return orient === 'w' ? v : 63 - v };
  const myPiece = sq => state && state.board[sq] && R.colorOf(state.board[sq]) === interactive;
  const myTurn = () => state && interactive && state.turn === interactive;
  function tryMove(from, to) {
    if (myTurn()) {
      const ms = legal.filter(m => m.from === from && m.to === to);
      if (!ms.length) return false;
      if (ms[0].promo && !autoQueen) { askPromo(ms); return true }
      sel = null; paintSquares(); onMove && onMove(ms.find(m => !m.promo || m.promo.toLowerCase() === 'q') || ms[0]); return true;
    }
    if (premoveOn && interactive && from !== to) { // queue a premove (checked again when it's your turn)
      const p = state.board[from]; if (!p || R.colorOf(p) !== interactive) return false;
      const fake = { ...state, turn: interactive, ep: -1 };
      if (!R.pseudoMoves(fake, false, true).some(m => m.from === from && m.to === to)) return false;
      premove = { from, to }; sel = null; paintSquares(); opts.onPremove && opts.onPremove(premove); return true;
    }
    return false;
  }
  function askPromo(ms) {
    const to = ms[0].to, col = interactive, [x, y] = xy(to), down = y === 0;
    promoEl.hidden = false;
    promoEl.innerHTML = `<div class="pr-col" style="left:${x * 12.5}%;${down ? 'top:0' : 'bottom:0'}">${['q', 'n', 'r', 'b'].map(t => `<button data-pr="${t}">${pieceSVG(col === 'w' ? t.toUpperCase() : t, set)}</button>`).join('')}<button data-pr="x" class="x">✕</button></div>`;
    promoEl.querySelectorAll('[data-pr]').forEach(b => b.onclick = e => {
      e.stopPropagation(); promoEl.hidden = true; promoEl.innerHTML = '';
      if (b.dataset.pr === 'x') { sel = null; paintSquares(); return }
      const m = ms.find(x => x.promo && x.promo.toLowerCase() === b.dataset.pr); sel = null; paintSquares(); onMove && onMove(m);
    });
  }
  let rStart = null;
  root.addEventListener('contextmenu', e => e.preventDefault());
  root.addEventListener('pointerdown', e => {
    if (!state || !promoEl.hidden) return;
    const sq = sqAt(e.clientX, e.clientY); if (sq == null) return;
    if (e.button === 2) { rStart = sq; return }
    if (userMarks.size || userArrows.length) { userMarks.clear(); userArrows = []; drawArrows() }
    if (premove && !myPiece(sq)) { premove = null; opts.onPremove && opts.onPremove(null) }
    if (sel != null && sq !== sel && (!myPiece(sq))) { if (tryMove(sel, sq)) return; sel = null; paintSquares(); return }
    if (!interactive || !myPiece(sq)) { sel = null; paintSquares(); return }
    e.preventDefault();
    const p = pieces.find(x => x.sq === sq); if (!p) return;
    const was = sel; sel = sq; paintSquares();
    const r = root.getBoundingClientRect();
    drag = { p, from: sq, was, x0: e.clientX, y0: e.clientY, moved: false, size: r.width / 8, r };
    root.setPointerCapture(e.pointerId);
  });
  root.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
    drag.moved = true;
    const { p, size, r } = drag;
    p.el.style.transition = 'none'; p.el.classList.add('drag');
    p.el.style.transform = `translate(${(e.clientX - r.left) / size * 100 - 50}%,${(e.clientY - r.top) / size * 100 - 50}%) scale(1.12)`;
    const over = sqAt(e.clientX, e.clientY);
    squares.forEach((d, v) => d.classList.toggle('over', (orient === 'w' ? v : 63 - v) === over));
  });
  const endDrag = e => {
    if (!drag) return;
    const d = drag; drag = null; d.p.el.classList.remove('drag'); squares.forEach(x => x.classList.remove('over'));
    const to = e && e.type !== 'pointercancel' ? sqAt(e.clientX, e.clientY) : null;
    if (d.moved) {
      if (to != null && to !== d.from && tryMove(d.from, to)) { if (!myTurn()) place(d.p, false); return }
      place(d.p, false);
      if (to != null && to !== d.from) { sel = null; paintSquares() }
    } else if (d.was === d.from) { sel = null; paintSquares() } // tapping the same piece again unselects it
  };
  root.addEventListener('pointerup', e => {
    if (e.button === 2 && rStart != null) { // right-click: mark a square or draw an arrow
      const to = sqAt(e.clientX, e.clientY);
      if (to != null) {
        if (to === rStart) userMarks.has(to) ? userMarks.delete(to) : userMarks.add(to);
        else { const c = e.shiftKey ? 'r' : e.altKey ? 'b' : e.ctrlKey ? 'y' : 'o'; const k = userArrows.findIndex(a => a.from === rStart && a.to === to); k >= 0 ? userArrows.splice(k, 1) : userArrows.push({ from: rStart, to, color: c }) }
        paintSquares(); drawArrows();
      }
      rStart = null; return;
    }
    endDrag(e);
  });
  root.addEventListener('pointercancel', () => endDrag(null));
  return {
    setPosition, flip, get orientation() { return orient },
    setInteractive(col, cb, o = {}) { interactive = col; onMove = cb; premoveOn = !!o.premove; legal = state && col && state.turn === col ? R.legalMoves(state) : []; if (!col) sel = null; paintSquares() },
    setArrows(a) { appArrows = a || []; drawArrows() },
    setHighlights(extra) { for (const k in hl) if (/hint|good|bad/.test(hl[k])) delete hl[k]; Object.assign(hl, extra || {}); paintSquares() },
    setBadges(b) { badges = b || []; drawBadges() },
    setOptions(o) {
      if (o.pieceSet && o.pieceSet !== set) { set = o.pieceSet; pieces.forEach(p => p.el.innerHTML = pieceSVG(p.p, set)) }
      if (o.autoQueen != null) autoQueen = o.autoQueen; if (o.showDots != null) showDots = o.showDots; if (o.coords != null) showCoords = o.coords; if (o.animMs != null) animMs = o.animMs;
      paintSquares();
    },
    takePremove() { const p = premove; premove = null; paintSquares(); return p },
    clearPremove() { premove = null; paintSquares() },
    hasPremove: () => !!premove,
    clearSelection() { sel = null; paintSquares() },
  };
}
