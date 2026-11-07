# Two-Thirds Preview

Visual prototype only of the Two-Thirds arena. Fake players. Not a real game, and not a Roblox experience.

The page is a static site meant for GitHub Pages from the repository root. There is no build step. Three.js `0.160.0` loads from the unpkg ES module CDN through an import map in `index.html`.

## Watch it

From the repo root:

```bash
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/`. Orbit with drag or one finger, and zoom with the wheel or a pinch. The player slider (4–100) rebuilds the ring immediately. Radius follows `r = 6 + 2.5√N` studs (one stud is one scene unit). Above 40 living players the crowd splits into an outer ring on that radius and an inner ring.

## What the loop shows

An elimination match plays by itself:

1. **Announce** — window and target. The target is 2/3 of the average, except about one round in six, which shows `?` until lock and then reveals 1/2, 3/4, or 1.0.
2. **Pick** — countdown. Bots cluster near 33, 22, and 50 (scaled to the window), with a few exact 0s and a random tail. The dial is your player, `YOU` / `001`.
3. **Lock** — picks freeze and the circle lamps pulse. A mystery multiplier is revealed here.
4. **Reveal** — crowd bar chart, average line, then the target line. Closest `|pick − target|` glows. Ties all glow. If every living player picked the same number, nobody wins the round.
5. **Results** — the farthest 50% (at least one, never everyone) lose their tiles and fall. The platform then eases to the new radius and the survivors re-space.

The window steps **0–100 → 0–50 → 0–25 → 0–10** every round. That compression is labeled **accelerated preview pacing**; the design doc narrows more slowly. At one player left, a winner card shows and the match restarts. `1× / 3×` speeds the clock. **Clip View** hides the HUD and leaves the arena and the reveal chart.

Design notes live in `docs/two-thirds-roblox-gdd.md`. The arena uses an original pink and teal geometric set. It does not use show logos or other copyrighted assets.
