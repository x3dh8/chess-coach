// Original piece set (drawn for this app). Each piece is a 100x100 SVG.
// Shapes are shared; color schemes give different "piece sets".
const SHAPE = {
  p: `<path class="b" d="M50 14c-9 0-16 7-16 16 0 5.5 2.6 10.3 6.7 13.3C33.8 47 30 53 30 59h40c0-6-3.8-12-10.7-15.7C63.4 40.3 66 35.5 66 30c0-9-7-16-16-16z"/>
       <path class="b" d="M27 86c0-11 6-20 15-24h16c9 4 15 13 15 24z"/><rect class="b" x="22" y="82" width="56" height="9" rx="4"/>`,
  r: `<path class="b" d="M24 16h11v8h8v-8h14v8h8v-8h11v18l-7 6v32l7 6v8H24v-8l7-6V40l-7-6z"/>
      <path class="l" d="M31 40h38M31 72h38"/><rect class="b" x="19" y="84" width="62" height="8" rx="3.5"/>`,
  n: `<path class="b" d="M30 85c-1-13 4-22 13-30-7 2-12 6-17 4-6-2-7-9-3-14 6-7 14-15 19-24l1-8c4 2 7 5 8 8 4 0 8 1 11 3 12 7 17 21 17 37 0 9-1 17-3 24z"/>
      <path class="l" d="M40 30c-3 4-7 8-10 11"/><circle class="e" cx="49" cy="29" r="3.2"/>
      <path class="l" d="M58 22c10 6 15 19 15 33"/><rect class="b" x="19" y="84" width="62" height="8" rx="3.5"/>`,
  b: `<circle class="b" cx="50" cy="13" r="5.5"/>
      <path class="b" d="M50 18c-12 9-19 20-19 31 0 9 6 15 12 18h14c6-3 12-9 12-18 0-11-7-22-19-31z"/>
      <path class="l" d="M54 34 46 46"/><path class="b" d="M38 67h24l3 7H35z"/>
      <path class="b" d="M22 86c8-1 17-3 28-9 11 6 20 8 28 9v6H22z"/>`,
  q: `<circle class="b" cx="16" cy="27" r="5.5"/><circle class="b" cx="32" cy="18" r="5.5"/><circle class="b" cx="50" cy="14" r="5.5"/><circle class="b" cx="68" cy="18" r="5.5"/><circle class="b" cx="84" cy="27" r="5.5"/>
      <path class="b" d="M17 32l12 38h42l12-38-14 18-6-27-9 26-4-28-4 28-9-26-6 27z"/>
      <path class="b" d="M27 70h46l2 9H25z"/><rect class="b" x="21" y="82" width="58" height="9" rx="4"/>`,
  k: `<path class="b" d="M46 8h8v7h7v8h-7v8h-8v-8h-7v-8h7z"/>
      <path class="b" d="M50 31c-6 0-10 5-10 11 0 4 2 8 5 10H34c-9-6-21-2-21 9 0 9 8 15 15 18l2 2h40l2-2c7-3 15-9 15-18 0-11-12-15-21-9H55c3-2 5-6 5-10 0-6-4-11-10-11z"/>
      <path class="l" d="M30 72h40M50 52v19"/><rect class="b" x="24" y="81" width="52" height="10" rx="4"/>`,
};
// Color schemes: [white fill, white shade, white line, black fill, black shade, black line]
export const SETS = {
  classic: { name: 'Classic', w: ['#ffffff', '#d9d4cc', '#2b2b2b'], b: ['#4a4744', '#1f1d1b', '#111'] },
  ivory: { name: 'Ivory & Wood', w: ['#fff7e6', '#e8cf9f', '#5a3b1c'], b: ['#8a5a2b', '#4a2c12', '#2a1606'] },
  slate: { name: 'Slate', w: ['#eef3f8', '#b9c7d6', '#1d2733'], b: ['#3c4a5c', '#1b2430', '#0c1118'] },
  neon: { name: 'Neon', w: ['#e9fbff', '#7fe3ff', '#0a8fb8'], b: ['#ff4fae', '#9c1660', '#4a0029'] },
  flat: { name: 'Flat', w: ['#f7f7f7', '#f7f7f7', '#444'], b: ['#333', '#333', '#111'] },
};
let n = 0;
export function pieceSVG(p, set = 'classic') {
  const t = p.toLowerCase(), col = p === t ? 'b' : 'w', S = SETS[set] || SETS.classic, [f, sh, ln] = S[col], id = 'g' + (++n);
  const eye = col === 'w' ? ln : '#fff';
  return `<svg viewBox="0 0 100 100" class="pz"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${f}"/><stop offset="1" stop-color="${sh}"/></linearGradient></defs>`
    + `<g fill="url(#${id})" stroke="${ln}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">`
    + SHAPE[t].replace(/class="l"/g, `fill="none" stroke="${col === 'w' ? ln : sh === f ? '#666' : 'rgba(255,255,255,.35)'}" stroke-width="2.6"`).replace(/class="e"/g, `fill="${eye}" stroke="none"`).replace(/class="b"/g, '')
    + '</g></svg>';
}
