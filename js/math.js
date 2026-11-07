// Pure round math for the Two-Thirds visual prototype.
// Target = multiplier * average. Closest |pick - target| wins. Ties all win.
// If every living player picks the same number, the round has no winner.

export const DEFAULT_MULTIPLIER = 2 / 3;
export const INNER_RING_SCALE = 0.56;
export const PLATFORM_MARGIN = 1.55;

const WINDOW_STEPS = [100, 50, 25, 10];

export function ringRadius(n) {
  return 6 + 2.5 * Math.sqrt(n);
}

export function ringMode(n) {
  return n > 40 ? 'double' : 'single';
}

export function windowMaxForRound(roundIndex) {
  return WINDOW_STEPS[Math.min(roundIndex, WINDOW_STEPS.length - 1)];
}

// One round in six. Index 2 lands inside a default 24-player elimination
// so the scripted preview actually shows a mystery multiplier.
export function isMysteryRound(roundIndex) {
  return roundIndex % 6 === 2;
}

export function mysteryMultiplier(roundIndex) {
  const options = [1 / 2, 3 / 4, 1];
  return options[Math.floor(roundIndex / 6) % options.length];
}

export function formatMultiplier(multiplier) {
  if (Math.abs(multiplier - DEFAULT_MULTIPLIER) < 1e-10) return '2/3';
  if (Math.abs(multiplier - 1 / 2) < 1e-10) return '1/2';
  if (Math.abs(multiplier - 3 / 4) < 1e-10) return '3/4';
  if (Math.abs(multiplier - 1) < 1e-10) return '1.0';
  return multiplier.toFixed(2);
}

export function pad3(n) {
  return String(n).padStart(3, '0');
}

export function clampInt(value, min, max) {
  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Clusters near 33, 22 and 50 (scaled to the window), a few exact 0s, and a random tail.
export function fakePick(max, rand) {
  const roll = rand();
  const spread = Math.max(1.2, max * 0.055);
  const around = (fraction) => {
    const center = fraction * max;
    const jitter = (rand() + rand() - 1) * spread;
    return clampInt(center + jitter, 0, max);
  };
  if (roll < 0.1) return 0;
  if (roll < 0.38) return around(0.33);
  if (roll < 0.64) return around(0.22);
  if (roll < 0.84) return around(0.5);
  return Math.floor(rand() * (max + 1));
}

// Fills `out` in place. Above 40 players, the outer ring sits on `radius`
// and the inner ring sits at INNER_RING_SCALE * radius.
export function fillLayout(n, radius, out) {
  for (let i = 0; i < n; i += 1) {
    if (!out[i]) out[i] = { x: 0, z: 0, angle: 0, ring: 'single' };
  }
  out.length = n;
  if (n <= 0) return out;

  // +Z is the near side for a camera that sits on positive Z.
  const start = Math.PI / 2;
  if (n <= 40) {
    for (let i = 0; i < n; i += 1) {
      const angle = start + (Math.PI * 2 * i) / n;
      const slot = out[i];
      slot.x = Math.cos(angle) * radius;
      slot.z = Math.sin(angle) * radius;
      slot.angle = angle;
      slot.ring = 'single';
    }
    return out;
  }

  const outerR = radius;
  const innerR = radius * INNER_RING_SCALE;
  let outerN = Math.round((n * outerR) / (outerR + innerR));
  outerN = Math.max(1, Math.min(n - 1, outerN));
  const innerN = n - outerN;

  for (let i = 0; i < outerN; i += 1) {
    const angle = start + (Math.PI * 2 * i) / outerN;
    const slot = out[i];
    slot.x = Math.cos(angle) * outerR;
    slot.z = Math.sin(angle) * outerR;
    slot.angle = angle;
    slot.ring = 'outer';
  }
  const innerShift = Math.PI / innerN;
  for (let i = 0; i < innerN; i += 1) {
    const angle = start + innerShift + (Math.PI * 2 * i) / innerN;
    const slot = out[outerN + i];
    slot.x = Math.cos(angle) * innerR;
    slot.z = Math.sin(angle) * innerR;
    slot.angle = angle;
    slot.ring = 'inner';
  }
  return out;
}

export function playerLayout(n, radius) {
  return fillLayout(n, radius, []);
}

export function evaluateRound(entries, multiplier) {
  const n = entries.length;
  if (n === 0) {
    return {
      average: 0,
      target: 0,
      winners: [],
      eliminated: [],
      allSame: true,
      elimCount: 0,
    };
  }

  let sum = 0;
  const first = entries[0].pick;
  let allSame = true;
  for (let i = 0; i < n; i += 1) {
    sum += entries[i].pick;
    if (entries[i].pick !== first) allSame = false;
  }

  const average = sum / n;
  const target = multiplier * average;
  const distances = new Array(n);
  let minDistance = Infinity;
  for (let i = 0; i < n; i += 1) {
    const distance = Math.abs(entries[i].pick - target);
    distances[i] = distance;
    if (distance < minDistance) minDistance = distance;
  }

  const winners = [];
  if (!allSame) {
    for (let i = 0; i < n; i += 1) {
      if (Math.abs(distances[i] - minDistance) <= 1e-6) winners.push(entries[i].id);
    }
  }

  const order = entries.map((_, index) => index);
  order.sort((a, b) => {
    const diff = distances[b] - distances[a];
    if (Math.abs(diff) > 1e-9) return diff;
    return entries[b].id - entries[a].id;
  });

  const elimCount = n < 2 ? 0 : Math.min(n - 1, Math.max(1, Math.floor(n / 2)));
  const eliminated = order.slice(0, elimCount).map((index) => entries[index].id);

  return { average, target, winners, eliminated, allSame, elimCount };
}
