// Stockfish in a background worker. One search at a time; requests wait their turn.
// Scores are from the side to move: cp (centipawns), or mate N (positive = we mate).
const SF_URL = new URL('./engine/stockfish-18-lite-single.js', import.meta.url).href;
let w = null, ready = null, busy = false, cur = null;
const queue = [];
function boot() {
  if (ready) return ready;
  ready = new Promise(res => {
    try {
      w = new Worker(SF_URL);
      const to = setTimeout(() => res(false), 25000);
      w.onmessage = e => {
        const line = String(e.data);
        if (line === 'readyok' && !cur) { clearTimeout(to); res(true); return }
        if (cur) onLine(line);
      };
      w.onerror = () => { clearTimeout(to); res(false) };
      ['uci', 'setoption name Hash value 32', 'isready'].forEach(c => w.postMessage(c));
    } catch (e) { res(false) }
  });
  return ready;
}
function onLine(line) {
  const c = cur;
  if (line.startsWith('info') && / pv /.test(line) && !/ (upper|lower)bound/.test(line)) {
    const m = line.match(/ depth (\d+).*? multipv (\d+).*? score (cp|mate) (-?\d+).*? pv (.+)$/);
    if (m) {
      const v = +m[4], k = +m[2] - 1;
      c.lines[k] = { uci: m[5].split(' ')[0], pv: m[5].split(' '), depth: +m[1], mate: m[3] === 'mate' ? v : null, cp: m[3] === 'cp' ? v : (v > 0 ? 100000 - v : -100000 - v) };
      c.depth = Math.max(c.depth, +m[1]);
      if (c.onInfo) c.onInfo(c.lines.filter(Boolean), c.depth);
    }
  } else if (line.startsWith('bestmove')) {
    clearTimeout(c.timer); cur = null; busy = false;
    const best = line.split(' ')[1];
    c.resolve({ best: best === '(none)' ? null : best, lines: c.lines.filter(Boolean), depth: c.depth });
    pump();
  }
}
function pump() {
  if (busy || !queue.length || !w) return;
  const job = queue.shift(); busy = true; cur = job; job.lines = []; job.depth = 0;
  const o = job.opts;
  const cmds = [`setoption name MultiPV value ${o.multipv || 1}`];
  if (o.elo) cmds.push('setoption name UCI_LimitStrength value true', `setoption name UCI_Elo value ${Math.max(1320, Math.min(3190, o.elo))}`);
  else cmds.push('setoption name UCI_LimitStrength value false');
  cmds.push(`setoption name Skill Level value ${o.skill == null ? 20 : o.skill}`);
  cmds.push(`position fen ${job.fen}`);
  cmds.push(o.depth ? `go depth ${o.depth}${o.movetime ? ' movetime ' + o.movetime : ''}` : `go movetime ${o.movetime || 500}`);
  cmds.forEach(c => w.postMessage(c));
  const limit = (o.movetime || 4000) + 15000;
  job.timer = setTimeout(() => { // stuck: restart the engine
    try { w.terminate() } catch (e) { } w = null; ready = null; busy = false; cur = null;
    job.resolve({ best: null, lines: job.lines.filter(Boolean), depth: job.depth, failed: true });
    boot().then(ok => ok && pump());
  }, limit);
}
// analyse(fen, { depth, movetime, multipv, elo, skill, urgent, onInfo })
export async function analyse(fen, opts = {}) {
  if (!(await boot())) return { best: null, lines: [], depth: 0, failed: true };
  return new Promise(resolve => {
    const job = { fen, opts, resolve, onInfo: opts.onInfo };
    if (opts.urgent) queue.unshift(job); else queue.push(job);
    pump();
  });
}
// Throw away anything still waiting (e.g. leaving a screen). The current search finishes on its own.
export function clearQueue(tag) {
  for (let i = queue.length - 1; i >= 0; i--) if (!tag || queue[i].opts.tag === tag) { const j = queue.splice(i, 1)[0]; j.resolve({ best: null, lines: [], depth: 0, cancelled: true }) }
}
export function stopCurrent() { if (cur && w) w.postMessage('stop') }
export const engineReady = boot;
