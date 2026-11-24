# Chess Coach

A personal chess training app that runs in the browser and installs on iPhone as a home-screen app.

- 43 opponents who are people: faces that react to the game, ages, countries, bios, their own openings and chat, plus Stockfish at full strength
- Play with a Coach (Sam, Maya or Rex): every move gets a label and an explanation, they warn you about threats, give tips, and stop you on blunders
- Voices: everyone talks out loud with the phone's built-in speech (free, offline), with accents from their country
- Full Game Review powered by Stockfish 18: accuracy, move labels, eval graph, retry mistakes
- 542 puzzles tagged by theme (fork, pin, skewer, discovered attack, back-rank mate...), 3-step hints, explanations, and why a wrong move fails
- Lessons for each tactic with an example and practice by theme
- Puzzle Rush, Daily Puzzle, and puzzles made from your own mistakes
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
