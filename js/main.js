import { createArena } from './arena.js';
import { createChart } from './chart.js';
import { createCrowd } from './crowd.js';
import { createMatch, PHASE_DURATION } from './match.js';
import { formatMultiplier, pad3, ringMode, windowMaxForRound } from './math.js';

const canvas = document.querySelector('#view');
const app = document.querySelector('#app');
const arena = createArena(canvas);
const crowd = createCrowd(arena.scene);
const match = createMatch(24);
const chart = createChart(document.querySelector('#chart'));

const phaseLabel = document.querySelector('#phase-label');
const roundLabel = document.querySelector('#round-label');
const phaseSub = document.querySelector('#phase-sub');
const phaseDetail = document.querySelector('#phase-detail');
const timerEl = document.querySelector('#timer');
const phaseBar = document.querySelector('#phase-bar');
const radiusValue = document.querySelector('#radius-value');
const rosterN = document.querySelector('#roster-n');
const rosterInput = document.querySelector('#roster');
const aliveLine = document.querySelector('#alive-line');
const pickValue = document.querySelector('#pick-value');
const lockButton = document.querySelector('#lock');
const lockState = document.querySelector('#lock-state');
const minusButton = document.querySelector('#minus');
const plusButton = document.querySelector('#plus');
const speedButton = document.querySelector('#speed');
const clipButton = document.querySelector('#clip');
const winnerCard = document.querySelector('#winner');
const winnerKicker = document.querySelector('#winner-kicker');
const winnerName = document.querySelector('#winner-name');
const pips = document.querySelector('#pips');

let speed = 1;
let clip = false;
let shownKey = '';
let pipKey = '';
let last = performance.now();
let hold = null;

const PHASE_TITLE = {
  announce: 'Announce',
  pick: 'Pick',
  lock: 'Lock',
  reveal: 'Reveal',
  results: 'Results',
  finale: 'Winner',
};

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function winnerLine(ids) {
  if (!ids.length) return 'No round winner · everyone matched';
  const labels = ids.slice(0, 4).map((id) => (id === 0 ? 'YOU' : pad3(id + 1)));
  const extra = ids.length > 4 ? ` +${ids.length - 4}` : '';
  return `Closest · ${labels.join(' ')}${extra}`;
}

function renderPips(windowMax) {
  const key = String(windowMax);
  if (key === pipKey) return;
  pipKey = key;
  const steps = [100, 50, 25, 10];
  pips.replaceChildren();
  for (let i = 0; i < steps.length; i += 1) {
    const pip = document.createElement('span');
    pip.textContent = String(steps[i]);
    if (steps[i] === windowMax) pip.className = 'on';
    pips.appendChild(pip);
  }
}

function renderHud() {
  const duration = PHASE_DURATION[match.phase];
  const progress = Math.min(1, match.phaseTime / duration);
  const remain = Math.max(0, duration - match.phaseTime);
  app.dataset.phase = match.phase;
  setText(phaseLabel, PHASE_TITLE[match.phase]);
  setText(roundLabel, `Round ${match.roundIndex + 1}`);
  setText(timerEl, remain.toFixed(1));
  phaseBar.style.width = `${progress * 100}%`;
  renderPips(match.windowMax);

  const windowLabel = `Window 0–${match.windowMax}`;
  const shownMultiplier = match.multiplierVisible ? formatMultiplier(match.activeMultiplier) : '?';
  const targetLine = match.multiplierVisible
    ? `Target · ${shownMultiplier} of the average`
    : 'Target · ? · revealed after lock';

  let sub = windowLabel;
  let detail = targetLine;
  if (match.phase === 'pick') {
    sub = `${windowLabel} · set your number`;
  } else if (match.phase === 'lock') {
    sub = 'Picks are frozen';
    detail = `Multiplier · ${formatMultiplier(match.activeMultiplier)} of the average`;
  } else if (match.phase === 'reveal' && match.result) {
    sub = `Avg ${match.result.average.toFixed(1)} · target ${match.result.target.toFixed(1)}`;
    detail = winnerLine(match.result.winners);
  } else if (match.phase === 'results' && match.result) {
    sub = `${match.result.elimCount} eliminated`;
    detail = match.living.length <= 1
      ? 'Circle closing · last player standing'
      : `Circle closing · next window 0–${windowMaxForRound(match.roundIndex + 1)}`;
  } else if (match.phase === 'finale') {
    sub = match.champion === 0 ? 'You win the match' : `Player ${pad3((match.champion ?? 0) + 1)} wins`;
    detail = 'Next match starting';
  }
  setText(phaseSub, sub);
  setText(phaseDetail, detail);

  setText(radiusValue, match.radius.toFixed(2));
  setText(rosterN, String(match.roster));
  if (Number(rosterInput.value) !== match.roster) rosterInput.value = String(match.roster);
  setText(
    aliveLine,
    `${match.living.length} alive · ${ringMode(match.living.length) === 'double' ? 'Two rings' : 'One ring'}`,
  );

  const editable = match.canEditPick;
  minusButton.disabled = !editable;
  plusButton.disabled = !editable;
  lockButton.disabled = !editable;
  setText(pickValue, match.youAlive ? pad3(match.youPick) : 'OUT');
  setText(lockButton, match.youLocked ? 'Locked' : 'Lock');
  setText(lockState, match.youAlive ? (match.youLocked ? 'Locked in' : 'Open') : 'Out');

  if (match.phase === 'finale' && match.champion != null) {
    winnerCard.hidden = false;
    setText(winnerKicker, match.champion === 0 ? 'You win' : 'Winner');
    setText(winnerName, match.champion === 0 ? 'YOU' : pad3(match.champion + 1));
  } else {
    winnerCard.hidden = true;
  }

  const chartKey = `${match.phase}:${match.roundIndex}:${match.matchId}:${match.result ? '1' : '0'}`;
  if (chartKey !== shownKey) {
    shownKey = chartKey;
    if ((match.phase === 'reveal' || match.phase === 'results') && match.result) {
      chart.show(match.entries, match.result, match.windowMax, formatMultiplier(match.activeMultiplier));
    } else {
      chart.hide();
    }
  }
  if (match.phase === 'reveal') chart.progress(progress);
  else if (match.phase === 'results') chart.progress(1);
}

function nudge(direction) {
  if (!match.canEditPick) return;
  match.setYouPick(match.youPick + direction);
}

function startHold(direction, event) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  nudge(direction);
  hold = { direction, wait: 0.34 };
}

function stopHold() {
  hold = null;
}

minusButton.addEventListener('pointerdown', (event) => startHold(-1, event));
plusButton.addEventListener('pointerdown', (event) => startHold(1, event));
minusButton.addEventListener('pointerup', stopHold);
plusButton.addEventListener('pointerup', stopHold);
minusButton.addEventListener('pointercancel', stopHold);
plusButton.addEventListener('pointercancel', stopHold);
minusButton.addEventListener('contextmenu', (event) => event.preventDefault());
plusButton.addEventListener('contextmenu', (event) => event.preventDefault());

lockButton.addEventListener('click', () => match.lockYou());

speedButton.addEventListener('click', () => {
  speed = speed === 1 ? 3 : 1;
  speedButton.textContent = speed === 1 ? '1×' : '3×';
  speedButton.setAttribute('aria-pressed', speed === 3 ? 'true' : 'false');
});

clipButton.addEventListener('click', () => {
  clip = !clip;
  document.body.classList.toggle('clip-view', clip);
  clipButton.setAttribute('aria-pressed', clip ? 'true' : 'false');
  clipButton.textContent = clip ? 'Exit clip' : 'Clip View';
});

rosterInput.addEventListener('input', () => {
  match.setYouPick(match.youPick);
  match.setRoster(Number(rosterInput.value));
  arena.frameCamera(match.radius, true);
  shownKey = '';
});

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    event.preventDefault();
    nudge(-1);
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    event.preventDefault();
    nudge(1);
  } else if (event.key === 'Enter' || event.key === 'l' || event.key === 'L') {
    match.lockYou();
  } else if (event.key === 'c' || event.key === 'C') {
    clipButton.click();
  }
});

window.addEventListener('resize', () => arena.resize());

window.__TWO_THIRDS__ = {
  ready: false,
  getState() {
    const result = match.result;
    const showResult = result && (match.phase === 'reveal' || match.phase === 'results' || match.phase === 'finale');
    return {
      ready: true,
      phase: match.phase,
      phaseProgress: Math.min(1, match.phaseTime / PHASE_DURATION[match.phase]),
      radius: match.radius,
      roster: match.roster,
      living: match.living.length,
      ringMode: ringMode(match.living.length),
      windowMax: match.windowMax,
      youPick: match.youPick,
      youLocked: match.youLocked,
      speed,
      pixelRatio: arena.pixelRatio,
      result: showResult
        ? {
            picks: match.entries.map((entry) => entry.pick),
            ids: match.entries.map((entry) => entry.id),
            average: result.average,
            target: result.target,
            winners: result.winners.slice(),
            eliminated: result.eliminated.slice(),
            allSame: result.allSame,
            elimCount: result.elimCount,
            multiplier: match.activeMultiplier,
          }
        : null,
    };
  },
};

arena.frameCamera(match.radius, true);
crowd.sync(match, 0, 0);
renderHud();
window.__TWO_THIRDS__.ready = true;

function frame(now) {
  const wall = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (hold) {
    if (!match.canEditPick) hold = null;
    else {
      hold.wait -= wall;
      if (hold.wait <= 0) {
        nudge(hold.direction);
        hold.wait = 0.07;
      }
    }
  }
  const dt = wall * speed;
  const time = now / 1000;
  match.step(dt);
  crowd.sync(match, time, dt);
  arena.update(match, time);
  renderHud();
  arena.render();
}

arena.renderer.setAnimationLoop(frame);
