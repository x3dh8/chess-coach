// Sounds made on the fly (no files needed): wooden clicks, knocks, chimes.
let ac = null, on = true;
export const setSound = v => { on = v };
export function unlock() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume() } catch (e) { } }
function knock(t, { freq = 1800, body = 180, len = .09, vol = 1, q = 1.4 } = {}) {
  const n = Math.floor(ac.sampleRate * len), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 5);
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol * .9;
  src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t);
  // the "wood" body
  const o = ac.createOscillator(), og = ac.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(body, t); o.frequency.exponentialRampToValueAtTime(body * .6, t + .08);
  og.gain.setValueAtTime(vol * .5, t); og.gain.exponentialRampToValueAtTime(.001, t + .09);
  o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + .1);
}
function tone(t, hz, len, vol = .18, type = 'sine') {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = hz; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + len);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + len + .02);
}
export function play(kind) {
  if (!on) return; unlock(); if (!ac) return;
  const t = ac.currentTime + .005;
  switch (kind) {
    case 'move': knock(t, { freq: 1500, body: 210, len: .07 }); break;
    case 'capture': knock(t, { freq: 900, body: 150, len: .12, vol: 1.3, q: 1 }); knock(t + .035, { freq: 2200, body: 260, len: .05, vol: .5 }); break;
    case 'castle': knock(t, { freq: 1500, body: 210, len: .07 }); knock(t + .11, { freq: 1300, body: 190, len: .07 }); break;
    case 'check': knock(t, { freq: 1500, body: 210, len: .07 }); tone(t + .02, 988, .18, .12, 'triangle'); tone(t + .1, 784, .25, .1, 'triangle'); break;
    case 'promote': knock(t, { freq: 1500, body: 210, len: .07 }); [523, 659, 784, 1047].forEach((h, i) => tone(t + .05 + i * .06, h, .2, .08)); break;
    case 'start': [392, 523, 659].forEach((h, i) => tone(t + i * .09, h, .3, .12)); break;
    case 'win': [523, 659, 784, 1047].forEach((h, i) => tone(t + i * .11, h, .45, .13)); break;
    case 'lose': [523, 440, 349].forEach((h, i) => tone(t + i * .16, h, .45, .12)); break;
    case 'draw': [523, 523].forEach((h, i) => tone(t + i * .18, h, .35, .1)); break;
    case 'tick': tone(t, 1600, .04, .07, 'square'); break;
    case 'illegal': tone(t, 140, .15, .15, 'sawtooth'); break;
    case 'good': [784, 1175].forEach((h, i) => tone(t + i * .08, h, .25, .1)); break;
    case 'bad': tone(t, 220, .3, .12, 'triangle'); break;
    case 'notify': tone(t, 880, .15, .1); tone(t + .12, 1320, .2, .08); break;
  }
}
