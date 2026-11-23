# Chess Coach

A personal chess training app that runs in the browser and installs on iPhone as a home-screen app.

- 21 bots from 250 to 3200, each with its own style
- Play with a Coach (Sam, Maya or Rex) who stops you on blunders and explains them
- Full Game Review powered by Stockfish 18: accuracy, move labels, eval graph, retry mistakes
- 542 puzzles, Puzzle Rush, Daily Puzzle, and puzzles made from your own mistakes
- Works offline. Everything is saved on the device (Settings → Save / Load backup to move it)

No build step. It's plain HTML and JavaScript modules, so any static host works.

## Deploy on Cloudflare Pages
Workers & Pages → Create → Pages → Connect to Git → pick this repo.
Framework preset: **None**. Build command: *(leave empty)*. Build output directory: **/**.
Every push to `main` redeploys automatically.

## Run locally
```
python3 -m http.server 8000
```
then open http://localhost:8000

Stockfish is GPLv3 (https://stockfishchess.org). Piece art, sounds and puzzles are original to this project.
