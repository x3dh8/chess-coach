// Opening book: main-line theory. Shared by the engine (to play book moves) and Game Review (to label Book moves).
import { initState, makeMove, posKey, sanToMove, moveToUci } from './rules.js';

/* ---------- Opening book: main lines played by strong players ---------- */
export const BOOK_LINES = [
  // Open games
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3',             // Ruy Lopez, Closed
  'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',        // Berlin
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6 a4 O-O Re1',                      // Italian, Giuoco Pianissimo
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3',                            // Two Knights quiet
  'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4',                // Scotch
  'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7',                      // Petroff
  'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O',                              // Philidor
  // Sicilian
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2',             // Najdorf, English Attack
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4',           // Dragon, Yugoslav
  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5',               // Sveshnikov
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be2 a6 O-O Nf6 Be3',                  // Taimanov
  'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nc6 c3 Nf6 Re1',                       // Moscow
  'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6',                               // Alapin
  // French / Caro-Kann / others vs e4
  'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5',               // French Classical
  'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4',                   // French Tarrasch
  'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4',                                    // French Advance
  'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3',  // Caro-Kann Classical
  'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3',                                      // Caro-Kann Advance
  'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6',                      // Scandinavian
  'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6',                                // Pirc
  'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7',                                // Alekhine
  'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nd7',                                        // Modern
  // Queen's pawn
  'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6',                          // QGD Tartakower
  'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5',                      // QGD Bf4
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O',                // Slav
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3',                   // Semi-Slav Meran
  'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6',                                // QGA
  'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3',                         // Nimzo-Indian Classical
  'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O',                             // Nimzo Rubinstein
  'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7',                                // Queen's Indian
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7',                  // King's Indian Classical
  'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3',                 // Grünfeld Exchange
  'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O',                 // Modern Benoni
  'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2',                          // Catalan
  'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 c3 e6 Nbd2 Bd6 Bg3 O-O Bd3',                    // London
  'd4 Nf6 Nf3 e6 Bf4 c5 e3 Nc6 c3 d5 Nbd2 Bd6 Bg3 O-O Bd3',                    // London vs Nf6
  'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3',                             // Dutch Leningrad
  // Flank openings
  'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7',                     // English, Four Knights
  'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 g6 Bg2 Bg7 O-O O-O d4 cxd4 Nxd4',                  // Symmetrical English
  'c4 Nf6 Nc3 e6 e4 d5 e5 d4 exf6 dxc3 bxc3 Qxf6 d4',                          // Mikenas
  'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4 d3 Nbd7 Nbd2 e5 e4',                           // Réti / KIA
  'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 d6 d4 O-O Be2 e5 O-O',
];
let BOOK = null;
function buildBook() {
  BOOK = new Map();
  for (const line of BOOK_LINES) {
    let s = initState();
    for (const san of line.split(' ')) {
      const m = sanToMove(s, san); if (!m) break;
      const k = posKey(s), u = moveToUci(m);
      if (!BOOK.has(k)) BOOK.set(k, new Map());
      const mm = BOOK.get(k); mm.set(u, (mm.get(u) || 0) + 1);
      s = makeMove(s, m);
    }
  }
}
export function bookMove(s) {
  if (!BOOK) buildBook();
  const mm = BOOK.get(posKey(s)); if (!mm) return null;
  // weighted by how often the move appears across lines
  const entries = [...mm.entries()], total = entries.reduce((a, e) => a + e[1], 0);
  let r = Math.random() * total;
  for (const [u, w] of entries) { r -= w; if (r <= 0) return u }
  return entries[0][0];
}

export function isBookMove(s, uci) {
  if (!BOOK) buildBook();
  const mm = BOOK.get(posKey(s)); return !!(mm && mm.has(uci));
}
