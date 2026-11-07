function smooth(start, end, progress) {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  const t = (progress - start) / (end - start);
  return t * t * (3 - 2 * t);
}

export function createChart(root) {
  root.innerHTML = `
    <div class="chart-top">
      <span class="chart-kicker">All picks</span>
      <span id="chart-stats"></span>
    </div>
    <div class="plot">
      <div class="bars" id="chart-bars"></div>
      <div class="vline avg" id="line-avg"><em>AVG</em></div>
      <div class="vline tgt" id="line-tgt"><em>TARGET</em></div>
    </div>
    <div class="axis"><span>0</span><span id="axis-max">100</span></div>
  `;

  const barsEl = root.querySelector('#chart-bars');
  const lineAvg = root.querySelector('#line-avg');
  const lineTgt = root.querySelector('#line-tgt');
  const axisMax = root.querySelector('#axis-max');
  const statsEl = root.querySelector('#chart-stats');
  let barNodes = [];

  function show(entries, result, windowMax, multiplierLabel) {
    root.hidden = false;
    const binCount = Math.min(windowMax + 1, 40);
    const binSize = (windowMax + 1) / binCount;
    const bins = [];
    for (let i = 0; i < binCount; i += 1) bins.push({ count: 0, win: false, you: false });
    const winners = new Set(result.winners);
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      let index = Math.floor(entry.pick / binSize);
      if (index >= binCount) index = binCount - 1;
      if (index < 0) index = 0;
      const bin = bins[index];
      bin.count += 1;
      if (winners.has(entry.id)) bin.win = true;
      if (entry.id === 0) bin.you = true;
    }
    let peak = 1;
    for (let i = 0; i < bins.length; i += 1) if (bins[i].count > peak) peak = bins[i].count;

    barsEl.replaceChildren();
    barNodes = bins.map((bin) => {
      const bar = document.createElement('div');
      bar.className = `bar${bin.win ? ' win' : ''}${bin.you ? ' you' : ''}`;
      bar.dataset.h = String((bin.count / peak) * 100);
      bar.style.height = '0%';
      barsEl.appendChild(bar);
      return bar;
    });

    const avgPct = windowMax === 0 ? 0 : (result.average / windowMax) * 100;
    const tgtPct = windowMax === 0 ? 0 : (result.target / windowMax) * 100;
    lineAvg.style.left = `${avgPct}%`;
    lineTgt.style.left = `${tgtPct}%`;
    axisMax.textContent = String(windowMax);
    statsEl.textContent = result.allSame
      ? 'No winner · same number'
      : `Avg ${result.average.toFixed(1)} · Target ${result.target.toFixed(1)} · ${multiplierLabel}`;
    progress(0);
  }

  function progress(value) {
    const grown = smooth(0, 0.38, value);
    for (let i = 0; i < barNodes.length; i += 1) {
      const bar = barNodes[i];
      bar.style.height = `${parseFloat(bar.dataset.h) * grown}%`;
    }
    lineAvg.style.opacity = String(smooth(0.38, 0.55, value));
    const dropped = smooth(0.55, 0.82, value);
    lineTgt.style.opacity = dropped > 0 ? '1' : '0';
    lineTgt.style.clipPath = `inset(${(1 - dropped) * 100}% 0 0 0)`;
    root.classList.toggle('winners-on', value >= 0.82);
  }

  function hide() {
    root.hidden = true;
    root.classList.remove('winners-on');
    barNodes = [];
  }

  return { show, progress, hide };
}
