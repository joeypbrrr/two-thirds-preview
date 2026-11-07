import {
  DEFAULT_MULTIPLIER,
  evaluateRound,
  fakePick,
  isMysteryRound,
  mulberry32,
  mysteryMultiplier,
  ringRadius,
  windowMaxForRound,
  clampInt,
} from './math.js';

export const PHASE_DURATION = {
  announce: 2.4,
  pick: 12,
  lock: 2.4,
  reveal: 6.4,
  results: 5.6,
  finale: 6,
};

const FALL_HOLD = 1.65;
const SHRINK_TIME = 2.15;

export function createMatch(roster) {
  const match = {
    roster: 24,
    matchId: 1,
    roundIndex: 0,
    living: [],
    fallingIds: [],
    phase: 'announce',
    phaseTime: 0,
    windowMax: 100,
    isMystery: false,
    activeMultiplier: DEFAULT_MULTIPLIER,
    youPick: 33,
    youLocked: false,
    botPicks: new Array(100).fill(0),
    entries: [],
    result: null,
    radius: ringRadius(24),
    radiusFrom: ringRadius(24),
    radiusTo: ringRadius(24),
    holdLayout: false,
    snap: true,
    champion: null,
    glowSet: new Set(),

    get youAlive() {
      return this.living.includes(0);
    },

    get canEditPick() {
      return this.youAlive && !this.youLocked && (this.phase === 'announce' || this.phase === 'pick');
    },

    get multiplierVisible() {
      if (!this.isMystery) return true;
      return this.phase === 'lock' || this.phase === 'reveal' || this.phase === 'results' || this.phase === 'finale';
    },

    setRoster(n) {
      const next = clampInt(n, 4, 100);
      this.roster = next;
      this.matchId += 1;
      this.roundIndex = 0;
      this.living = [];
      for (let i = 0; i < next; i += 1) this.living.push(i);
      this.fallingIds = [];
      this.result = null;
      this.champion = null;
      this.phase = 'announce';
      this.phaseTime = 0;
      this.youLocked = false;
      this.setupRound();
      this.radius = ringRadius(this.living.length);
      this.radiusFrom = this.radius;
      this.radiusTo = this.radius;
      this.holdLayout = false;
      this.snap = true;
      this.glowSet.clear();
    },

    setupRound() {
      this.windowMax = windowMaxForRound(this.roundIndex);
      this.youPick = clampInt(this.youPick, 0, this.windowMax);
      this.youLocked = false;
      this.isMystery = isMysteryRound(this.roundIndex);
      this.activeMultiplier = this.isMystery
        ? mysteryMultiplier(this.roundIndex)
        : DEFAULT_MULTIPLIER;
      this.result = null;
      const rand = mulberry32(this.matchId * 9973 + (this.roundIndex + 1) * 10007 + this.roster * 97 + 13);
      for (let i = 0; i < this.living.length; i += 1) {
        const id = this.living[i];
        if (id === 0) continue;
        this.botPicks[id] = fakePick(this.windowMax, rand);
      }
    },

    setYouPick(value) {
      if (!this.canEditPick) return;
      this.youPick = clampInt(value, 0, this.windowMax);
    },

    lockYou() {
      if (!this.canEditPick) return;
      this.youLocked = true;
    },

    step(dt) {
      this.phaseTime += dt;
      this.updateMotion();
      this.updateGlow();
      const duration = PHASE_DURATION[this.phase];
      if (this.phaseTime >= duration) {
        this.phaseTime = 0;
        this.advance();
      }
    },

    updateMotion() {
      if (this.phase !== 'results') return;
      if (this.phaseTime < FALL_HOLD) {
        this.holdLayout = true;
        this.radius = this.radiusFrom;
        return;
      }
      this.holdLayout = false;
      const u = Math.min(1, (this.phaseTime - FALL_HOLD) / SHRINK_TIME);
      const eased = u * u * (3 - 2 * u);
      this.radius = this.radiusFrom + (this.radiusTo - this.radiusFrom) * eased;
    },

    updateGlow() {
      this.glowSet.clear();
      if (!this.result && this.phase !== 'finale') return;
      if (this.phase === 'reveal' && this.phaseTime >= PHASE_DURATION.reveal * 0.8) {
        for (let i = 0; i < this.result.winners.length; i += 1) this.glowSet.add(this.result.winners[i]);
      } else if (this.phase === 'results' && this.phaseTime < FALL_HOLD && this.result) {
        for (let i = 0; i < this.result.winners.length; i += 1) this.glowSet.add(this.result.winners[i]);
      } else if (this.phase === 'finale' && this.champion != null) {
        this.glowSet.add(this.champion);
      }
    },

    snapshotPicks() {
      this.entries = this.living.map((id) => ({
        id,
        pick: id === 0 ? this.youPick : this.botPicks[id],
      }));
    },

    advance() {
      switch (this.phase) {
        case 'announce':
          this.phase = 'pick';
          break;
        case 'pick':
          this.youLocked = true;
          this.snapshotPicks();
          this.phase = 'lock';
          break;
        case 'lock':
          this.result = evaluateRound(this.entries, this.activeMultiplier);
          this.phase = 'reveal';
          break;
        case 'reveal':
          this.phase = 'results';
          this.fallingIds = this.result.eliminated.slice();
          {
            const drop = new Set(this.fallingIds);
            this.living = this.living.filter((id) => !drop.has(id));
          }
          this.holdLayout = true;
          this.radiusFrom = this.radius;
          this.radiusTo = ringRadius(Math.max(1, this.living.length));
          break;
        case 'results':
          this.fallingIds = [];
          this.holdLayout = false;
          this.radius = this.radiusTo;
          if (this.living.length <= 1) {
            this.champion = this.living[0];
            this.phase = 'finale';
          } else {
            this.roundIndex += 1;
            this.phase = 'announce';
            this.setupRound();
          }
          break;
        case 'finale':
          this.setRoster(this.roster);
          break;
        default:
          break;
      }
    },
  };

  match.setRoster(roster);
  match.matchId = 1;
  return match;
}
