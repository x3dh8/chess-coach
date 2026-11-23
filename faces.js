// Illustrated portraits drawn in SVG. Every opponent is a person with their own look,
// and their face changes with the game: happy when winning, worried when losing.
const SKIN = ['#fbe0cc', '#f3c9a5', '#e3ad7f', '#c98b5b', '#9a6440', '#6b4129'];
export const HAIR = { black: '#1f1a17', dark: '#3b2a20', brown: '#6b4428', auburn: '#8f3f23', ginger: '#c4652e', blond: '#d9b26a', platinum: '#ece0c2', gray: '#b9b6b1', white: '#e9e7e3', blue: '#3a5fb8', pink: '#d66aa0' };

function shade(hex, f) { // f < 0 darker, f > 0 lighter
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
let uid = 0;

const HAIR_BACK = {
  long: 'M27,46 C24,21 38,14 50,14 C62,14 76,21 73,46 L76,84 Q50,92 24,84Z',
  bob: 'M26.5,47 C24,21 38,15 50,15 C62,15 76,21 73.5,47 L74,67 Q68,72 63,67 L37,67 Q32,72 26,67Z',
  wavy: 'M27,46 C23,21 38,14 50,14 C62,14 77,21 73,46 C78,56 72,62 76,70 C79,78 70,84 64,82 L36,82 C30,84 21,78 24,70 C28,62 22,56 27,46Z',
  afro: 'M50,8 C73,8 82,24 80,42 C79,54 74,60 70,62 L30,62 C26,60 21,54 20,42 C18,24 27,8 50,8Z',
  ponytail: 'M63,24 C82,26 84,52 77,74 C74,62 71,44 64,34Z',
  bunback: '',
};
const HAIR_FRONT = {
  short: 'M30,47 C28,26 40,18 52,19 C64,19 72,28 70,47 C68,40 66,35 63,32 C57,35 47,35 38,31 C34,35 32,40 30,47Z',
  side: 'M30,48 C27,25 42,16 55,19 C67,21 72,31 70,47 C68,39 65,34 61,30 C52,33 42,31 35,34 C32,38 31,42 30,48Z',
  spiky: 'M30,46 L28.5,30 L35,32 L35,19 L42,26 L46,15 L51,24 L57,15 L59,25 L66,19 L65,30 L71.5,29 L70,46 C67,37 63,33 58,32 C50,35 42,34 36,33 C33,37 31,41 30,46Z',
  buzz: 'M31,45 C30,27 40,21.5 50,21.5 C60,21.5 70,27 69,45 C67,36 63,31 50,30 C37,31 33,36 31,45Z',
  slick: 'M30,45 C27,10 73,10 70,45 C68,34 62,28.5 50,28 C38,28.5 32,34 30,45Z',
  bangs: 'M30,48 C28,23 42,16 51,17 C61,17 72,24 70,48 C69,40 66,33 60,29 C55,33 46,36 37,36 C33,39 31,43 30,48Z',
  fringe: 'M30,46 C27,10 73,10 70,46 C69.5,41 69,38 68,36.5 Q50,39 32,36.5 C31,38 30.5,41 30,46Z',
  bun: 'M30,46 C27,10 73,10 70,46 C68,36 62,30 50,29 C38,30 32,36 30,46Z',
  ponytail: 'M30,46 C27,10 73,10 70,46 C68,36 62,30 50,29 C38,30 32,36 30,46Z',
  parted: 'M30,47 C28,24 41,17 50,18 C59,17 72,24 70,47 C68,38 63,31 52,28 L50,31 L48,28 C37,31 32,38 30,47Z',
  receding: 'M30.5,49 C30,40 31,33 34,29 C37,33 37,40 36,46Z M69.5,49 C70,40 69,33 66,29 C63,33 63,40 64,46Z M40,27 C45,24 55,24 60,27 C55,28 45,28 40,27Z',
  bald: 'M30.5,51 C30,45 31,41 33,38 C35,42 35.5,46 35,50Z M69.5,51 C70,45 69,41 67,38 C65,42 64.5,46 65,50Z',
  afro: '',
  curly: '',
  none: '',
};
function curls(c, top = 21, n = 9, r = 6.2) { // a ring of curls over the head
  let h = '';
  for (let i = 0; i <= n; i++) { const a = Math.PI * (1.05 + .9 * i / n), x = 50 + Math.cos(a) * 21, y = 44 + Math.sin(a) * (44 - top); h += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}"/>` }
  return h + `<circle cx="50" cy="${top + 5}" r="${r + 1}" fill="${c}"/><circle cx="41" cy="${top + 8}" r="${r}" fill="${c}"/><circle cx="59" cy="${top + 8}" r="${r}" fill="${c}"/>`;
}

const MOUTH = {
  neutral: (l) => `<path d="M45,61.5 Q50,62.8 55,61.5" stroke="${l}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  smile: (l) => `<path d="M44.5,60.5 Q50,64.5 55.5,60.5" stroke="${l}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
  happy: () => `<path d="M43.5,59.8 Q50,60.8 56.5,59.8 Q55.5,67.5 50,67.5 Q44.5,67.5 43.5,59.8Z" fill="#7b2b2b"/><path d="M44.6,60.3 Q50,61.2 55.4,60.3 L55,62 Q50,62.8 45,62Z" fill="#fff"/>`,
  smug: (l) => `<path d="M45,62 Q51,63.4 56,59.6" stroke="${l}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
  worried: (l) => `<path d="M45,63 Q47.5,61 50,62 Q52.5,63 55,61.4" stroke="${l}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  sad: (l) => `<path d="M45,63.8 Q50,59.8 55,63.8" stroke="${l}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
  surprised: () => `<ellipse cx="50" cy="62.5" rx="2.6" ry="3.3" fill="#7b2b2b"/>`,
  think: (l) => `<path d="M46,62 L53,61.4" stroke="${l}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
};
// brows: [left inner y, left outer y]; right is mirrored
const BROWS = { neutral: [41.2, 41.6], smile: [41, 41.4], happy: [40.4, 41.2], smug: [42.2, 40.6], worried: [39.4, 42.2], sad: [39.8, 42.4], surprised: [38.6, 39.4], think: [42.4, 40.8] };

// f: { skin 0-5, hair style, hc colour, back (extra back hair), beard, glasses, hat, hatc, shirt, bg, age, freckles, earrings, eye }
export function faceSVG(f, mood = 'neutral') {
  if (f.engine) return engineSVG(f);
  const id = 'f' + (++uid), sk = SKIN[f.skin ?? 1], skD = shade(sk, -.16), hc = HAIR[f.hc] || f.hc || HAIR.dark;
  const lip = shade(sk, -.45), browC = f.hair === 'bald' || f.hair === 'none' ? shade(sk, -.5) : shade(hc, f.hc === 'white' || f.hc === 'gray' || f.hc === 'platinum' ? -.35 : -.1);
  const kid = f.age === 'kid', old = f.age === 'old', shirt = f.shirt || '#3d6fb6';
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="face"><defs><radialGradient id="${id}g" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="${shade(f.bg || '#557', .22)}"/><stop offset="1" stop-color="${f.bg || '#557'}"/></radialGradient></defs>`;
  s += `<rect width="100" height="100" fill="url(#${id}g)"/><g transform="translate(50 57) scale(1.22) translate(-50 -50)">`;
  // back hair
  const back = f.back || (['long', 'bob', 'wavy', 'afro', 'ponytail'].includes(f.hair) ? f.hair : null);
  if (back && HAIR_BACK[back]) s += `<path d="${HAIR_BACK[back]}" fill="${shade(hc, -.12)}"/>`;
  if (f.hair === 'dreads') for (let x = 26; x <= 74; x += 5.3) s += `<rect x="${(x - 2.6).toFixed(1)}" y="30" width="5.2" height="${x < 36 || x > 64 ? 50 : 26}" rx="2.6" fill="${shade(hc, x % 2 ? -.1 : -.2)}"/>`;
  if (f.hair === 'bun') s += `<circle cx="50" cy="16.5" r="8.5" fill="${hc}"/><circle cx="47" cy="14" r="3" fill="${shade(hc, .15)}" opacity=".5"/>`;
  // body
  s += `<path d="M13,100 C14,80 28,73 50,73 C72,73 86,80 87,100Z" fill="${shirt}"/>`;
  s += `<path d="M41,70 L41,77 Q50,84 59,77 L59,70Z" fill="${skD}"/>`;
  if (f.collar) s += `<path d="M38,74 L50,84 L44,90 L35,77Z M62,74 L50,84 L56,90 L65,77Z" fill="${shade(shirt, .55)}"/>`;
  else s += `<path d="M40,74.5 Q50,82 60,74.5" stroke="${shade(shirt, -.25)}" stroke-width="2" fill="none"/>`;
  if (f.tie) s += `<path d="M48.5,83 L51.5,83 L53,95 L50,99 L47,95Z" fill="${f.tie}"/>`;
  // ears
  s += `<ellipse cx="30.8" cy="49" rx="4" ry="5.6" fill="${sk}"/><ellipse cx="69.2" cy="49" rx="4" ry="5.6" fill="${sk}"/><ellipse cx="31.2" cy="49" rx="1.8" ry="3" fill="${skD}" opacity=".55"/><ellipse cx="68.8" cy="49" rx="1.8" ry="3" fill="${skD}" opacity=".55"/>`;
  if (f.earrings) s += `<circle cx="30.4" cy="56" r="1.7" fill="${f.earrings}"/><circle cx="69.6" cy="56" r="1.7" fill="${f.earrings}"/>`;
  // head
  const jaw = kid ? 'M31,46 C31,29 39,23 50,23 C61,23 69,29 69,46 C69,59 62,68 50,68 C38,68 31,59 31,46Z' : f.jaw === 'square' ? 'M31,45 C31,29 39,22.5 50,22.5 C61,22.5 69,29 69,45 C69,58 66,64 60,68 Q50,72 40,68 C34,64 31,58 31,45Z' : 'M31,46 C31,30 39,22.5 50,22.5 C61,22.5 69,30 69,46 C69,60 61,70.5 50,70.5 C39,70.5 31,60 31,46Z';
  s += `<path d="${jaw}" fill="${sk}"/>`;
  s += `<path d="${jaw}" fill="none" stroke="${skD}" stroke-width=".6" opacity=".6"/>`;
  if (old) s += `<path d="M40,35.5 Q50,33.5 60,35.5 M42,38 Q50,36.6 58,38" stroke="${skD}" stroke-width=".8" fill="none" opacity=".8"/><path d="M34.5,50 l-2.2,1.2 M34.5,52 l-2,0.4 M65.5,50 l2.2,1.2 M65.5,52 l2,0.4 M41,57 Q39,61 41.5,64 M59,57 Q61,61 58.5,64" stroke="${skD}" stroke-width=".8" fill="none"/>`;
  if (f.freckles) s += [[38, 54], [40.5, 55.5], [37, 56.5], [62, 54], [59.5, 55.5], [63, 56.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".75" fill="${shade(sk, -.32)}"/>`).join('');
  const blush = ['happy', 'smile'].includes(mood) || kid;
  if (blush) s += `<ellipse cx="38" cy="56.5" rx="3.6" ry="2.1" fill="#ff7d7d" opacity="${kid ? .28 : .2}"/><ellipse cx="62" cy="56.5" rx="3.6" ry="2.1" fill="#ff7d7d" opacity="${kid ? .28 : .2}"/>`;
  if (mood === 'worried' || mood === 'sad') s += `<path d="M66,39 q1.6,3.2 0,4.4 q-1.6,-1.2 0,-4.4Z" fill="#9fd3ff" opacity=".9"/>`;
  // eyes
  const ey = 48.5, er = kid ? 3.2 : 2.7, ec = f.eye || '#2e221b';
  if (mood === 'happy') s += `<path d="M38.8,${ey + 1} Q42,${ey - 2.6} 45.2,${ey + 1} M54.8,${ey + 1} Q58,${ey - 2.6} 61.2,${ey + 1}" stroke="#2b211c" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  else {
    const big = mood === 'surprised' ? 1.25 : 1, half = mood === 'smug' || mood === 'think';
    s += `<g class="eyes"><ellipse cx="42" cy="${ey}" rx="${(er + .9) * big}" ry="${(er + .6) * big}" fill="#fff"/><ellipse cx="58" cy="${ey}" rx="${(er + .9) * big}" ry="${(er + .6) * big}" fill="#fff"/>`;
    s += `<circle cx="${mood === 'think' ? 43 : 42.3}" cy="${ey + .3 - (mood === 'think' ? 1 : 0)}" r="${er * .8}" fill="${ec}"/><circle cx="${mood === 'think' ? 59 : 58.3}" cy="${ey + .3 - (mood === 'think' ? 1 : 0)}" r="${er * .8}" fill="${ec}"/>`;
    s += `<circle cx="43.2" cy="${ey - .8}" r=".8" fill="#fff"/><circle cx="59.2" cy="${ey - .8}" r=".8" fill="#fff"/>`;
    if (half) s += `<path d="M38,${ey - 3.6} L46,${ey - 3.6} L46,${ey - .2} Q42,${ey - 1.4} 38,${ey - .2}Z M54,${ey - 3.6} L62,${ey - 3.6} L62,${ey - .2} Q58,${ey - 1.4} 54,${ey - .2}Z" fill="${sk}"/>`;
    s += `<path d="M38.4,${ey - 1.2} Q42,${ey - 4.6} 45.8,${ey - 1.2} M54.2,${ey - 1.2} Q58,${ey - 4.6} 61.6,${ey - 1.2}" stroke="#2b211c" stroke-width="${f.lashes ? 1.5 : .9}" fill="none" stroke-linecap="round"/></g>`;
  }
  // brows
  const [bi, bo] = BROWS[mood] || BROWS.neutral, bw = f.thickBrows ? 2.4 : 1.7;
  s += `<path d="M46.5,${bi} Q42,${(bi + bo) / 2 - 1.3} 37.5,${bo} M53.5,${bi} Q58,${(bi + bo) / 2 - 1.3} 62.5,${bo}" stroke="${browC}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`;
  // nose
  s += `<path d="M50.5,50 Q48.4,55.2 49.4,56.4 Q50.6,57.2 52.2,56.2" stroke="${shade(sk, -.3)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  // facial hair (under mouth)
  const bc = shade(hc, -.05);
  if (f.beard === 'stubble') s += `<path d="M33,54 C34,64 41,70 50,70 C59,70 66,64 67,54 C64,61 60,64 56,64.5 Q50,62.5 44,64.5 C40,64 36,61 33,54Z" fill="${bc}" opacity=".28"/>`;
  if (f.beard === 'full') s += `<path d="M31,48 C31,64 39,74.5 50,74.5 C61,74.5 69,64 69,48 C67,55 63,59 58.5,60.5 Q50,57.5 41.5,60.5 C37,59 33,55 31,48Z" fill="${bc}"/><path d="M44,63.6 Q50,66.6 56,63.6 Q50,64.8 44,63.6Z" fill="${sk}"/>`;
  if (f.beard === 'goatee') s += `<path d="M45,64.5 Q50,66 55,64.5 L54,69.5 Q50,72 46,69.5Z" fill="${bc}"/>`;
  // mouth
  s += (MOUTH[mood] || MOUTH.neutral)(lip);
  if (f.beard === 'full' || f.beard === 'mustache' || f.beard === 'goatee') s += `<path d="M42.5,60.2 Q46,56.6 50,58 Q54,56.6 57.5,60.2 Q54,59.2 50,59.8 Q46,59.2 42.5,60.2Z" fill="${bc}"/>`;
  // front hair
  if (f.hair === 'curly') s += curls(hc, 20, 10, 5.8);
  else if (f.hair === 'afro') s += curls(hc, 17, 11, 6.4);
  else if (f.hair === 'dreads') { s += `<path d="${HAIR_FRONT.short}" fill="${hc}"/>`; for (let x = 33; x <= 67; x += 5.6) s += `<rect x="${(x - 2.5).toFixed(1)}" y="${22 + Math.abs(50 - x) * .12}" width="5" height="${15 - Math.abs(50 - x) * .12}" rx="2.5" fill="${shade(hc, .1)}"/>` }
  else if (HAIR_FRONT[f.hair]) s += `<path d="${HAIR_FRONT[f.hair]}" fill="${hc}"${f.hair === 'buzz' ? ' opacity=".8"' : ''}/>`;
  if (['short', 'side', 'parted', 'slick', 'bangs', 'bun', 'fringe', 'ponytail'].includes(f.hair)) s += `<path d="${f.hair === 'parted' ? 'M50,20 Q51,26 51,30' : 'M40,23 Q50,19 60,22'}" stroke="${shade(hc, .25)}" stroke-width="1.3" fill="none" opacity=".45" stroke-linecap="round"/>`;
  // glasses
  if (f.glasses) {
    const gc = f.glassesC || '#1d1d1f';
    if (f.glasses === 'round') s += `<g fill="rgba(255,255,255,.14)" stroke="${gc}" stroke-width="1.5"><circle cx="42" cy="${ey}" r="5.6"/><circle cx="58" cy="${ey}" r="5.6"/></g>`;
    else s += `<g fill="rgba(255,255,255,.14)" stroke="${gc}" stroke-width="1.6"><rect x="35.6" y="${ey - 4.4}" width="12.6" height="8.8" rx="2.4"/><rect x="51.8" y="${ey - 4.4}" width="12.6" height="8.8" rx="2.4"/></g>`;
    s += `<path d="M47.6,${ey - .6} Q50,${ey - 2} 52.4,${ey - .6} M35.8,${ey - 1} L31,${ey - 2} M64.2,${ey - 1} L69,${ey - 2}" stroke="${gc}" stroke-width="1.4" fill="none"/>`;
  }
  // hats
  const hatc = f.hatc || '#c0392b';
  if (f.hat === 'beanie') s += `<path d="M28.5,40 C27,16 73,16 71.5,40Z" fill="${hatc}"/><rect x="27.5" y="35.5" width="45" height="8" rx="3.5" fill="${shade(hatc, -.18)}"/><circle cx="50" cy="15" r="4.5" fill="${shade(hatc, .3)}"/>`;
  if (f.hat === 'cap') s += `<path d="M29.5,40 C29,18 71,18 70.5,40Z" fill="${hatc}"/><path d="M29,39 Q50,34 71,39 Q58,46 34,43Z" fill="${shade(hatc, -.25)}"/><circle cx="50" cy="20" r="1.6" fill="${shade(hatc, -.3)}"/>`;
  if (f.hat === 'headphones') s += `<path d="M28,48 C26,16 74,16 72,48" stroke="#2d3436" stroke-width="3.4" fill="none"/><rect x="23.5" y="41" width="9" height="15" rx="4" fill="${hatc}"/><rect x="67.5" y="41" width="9" height="15" rx="4" fill="${hatc}"/>`;
  if (f.hat === 'band') s += `<path d="M30,35 Q50,27 70,35" stroke="${hatc}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
  if (f.hat === 'scarf') s += `<path d="M27,47 C24,16 76,16 73,47 C74,60 70,70 66,76 L34,76 C30,70 26,60 27,47Z M33,46 C33,32 40,26 50,26 C60,26 67,32 67,46 C67,58 61,69 50,69 C39,69 33,58 33,46Z" fill="${hatc}" fill-rule="evenodd"/><path d="M34,76 Q50,82 66,76 L70,92 Q50,98 30,92Z" fill="${hatc}"/>`;
  return s + '</g></svg>';
}
function engineSVG(f) {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="face"><rect width="100" height="100" fill="${f.bg || '#1e272e'}"/>
  <rect x="26" y="26" width="48" height="48" rx="8" fill="#2f3a44" stroke="#6ab04c" stroke-width="2.5"/>
  ${[34, 44, 56, 66].map(p => `<path d="M${p},16 L${p},26 M${p},74 L${p},84 M16,${p} L26,${p} M74,${p} L84,${p}" stroke="#6ab04c" stroke-width="2.5" stroke-linecap="round"/>`).join('')}
  <path d="M42,62 h16 l-2,-4 h-12z M44,58 l2,-8 h8 l2,8z M46,50 q-3,-3 0,-7 q4,-4 8,0 q3,4 0,7z" fill="#dfe6e9"/>
  <circle cx="50" cy="38" r="2" fill="#6ab04c"/></svg>`;
}
