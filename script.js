/* ================================================
   the vote — script.js

   votes are read from votes.js in the same folder.
   update votes.js and push to github — done.
   ================================================ */

const TARGET = new Date('2026-05-09T10:00:00');

const PEOPLE = ['Omni', 'Felix', 'Annie', 'Karam', 'Myat', 'Tanner', 'Aiden', 'Lincoln', 'Lily'];

const COLORS = {
  Omni:    '#ff6b6b',
  Felix:   '#4ecdc4',
  Annie:   '#ffe66d',
  Karam:   '#a8ff78',
  Myat:    '#c77dff',
  Tanner:  '#ff9a3c',
  Aiden:   '#48cae4',
  Lincoln: '#f4a261',
  Lily:    '#f72585',
};

let chartRendered = false;
let prevOrder = [];

// ================================================
// COUNTDOWN
// ================================================

function tick() {
  const diff = TARGET - Date.now();

  if (diff <= 0) {
    ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => setNum(id, '00'));
    return;
  }

  const p = n => String(n).padStart(2, '0');
  setNum('cd-days',  p(Math.floor(diff / 86400000)));
  setNum('cd-hours', p(Math.floor((diff % 86400000) / 3600000)));
  setNum('cd-mins',  p(Math.floor((diff % 3600000)  / 60000)));
  setNum('cd-secs',  p(Math.floor((diff % 60000)    / 1000)));
}

function setNum(id, val) {
  const el = document.getElementById(id);
  if (!el || el.textContent === val) return;
  el.textContent = val;
  el.classList.remove('tick');
  void el.offsetWidth;
  el.classList.add('tick');
  setTimeout(() => el.classList.remove('tick'), 220);
}

// ================================================
// FETCH votes.js (same repo, relative path)
// ================================================

async function fetchVotes() {
  try {
    const res = await fetch('./votes.js?_=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parse(await res.text());
  } catch (e) {
    console.warn('[votes]', e);
    return null;
  }
}

function parse(text) {
  const totals = {};
  PEOPLE.forEach(p => (totals[p] = 0));

  for (const raw of text.split('\n')) {
    const m = raw.trim().match(/^([A-Za-z]+)\s*[-–—]\s*(\d+)\s*$/);
    if (!m) continue;
    const person = PEOPLE.find(p => p.toLowerCase() === m[1].toLowerCase());
    if (person) totals[person] += parseInt(m[2], 10);
  }

  return totals;
}

// ================================================
// CHART
// ================================================

function getSorted(votes) {
  return PEOPLE
    .map(p => ({ name: p, v: votes[p] || 0 }))
    .sort((a, b) => b.v - a.v || PEOPLE.indexOf(a.name) - PEOPLE.indexOf(b.name));
}

function renderChart(votes) {
  const area    = document.getElementById('chart-area');
  const loading = document.getElementById('state-loading');
  const errEl   = document.getElementById('state-error');
  const totalEl = document.getElementById('total-votes');

  loading.classList.add('hidden');

  if (votes === null) {
    errEl.classList.remove('hidden');
    return;
  }

  errEl.classList.add('hidden');

  const list  = getSorted(votes);
  const total = list.reduce((s, p) => s + p.v, 0);
  const maxV  = Math.max(...list.map(p => p.v), 1);

  totalEl.textContent = `${total} vote${total !== 1 ? 's' : ''} counted`;

  if (!chartRendered) {
    chartRendered = true;
    area.innerHTML = '';

    list.forEach((person, i) => {
      const row = makeRow(person, i, total, maxV);
      row.style.animationDelay = `${i * 0.07}s`;
      area.appendChild(row);
    });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      list.forEach(person => setFill(area, person, maxV));
    }));

    prevOrder = list.map(p => p.name);
    return;
  }

  // update existing
  list.forEach((person, i) => {
    const isFirst = i === 0;
    setFill(area, person, maxV);

    const count = area.querySelector(`.bar-count[data-p="${person.name}"]`);
    const rank  = area.querySelector(`.bar-rank[data-p="${person.name}"]`);
    const pct   = area.querySelector(`.bar-pct[data-p="${person.name}"]`);
    const row   = area.querySelector(`.bar-row[data-p="${person.name}"]`);

    if (count) count.textContent = person.v;
    if (rank)  { rank.textContent = isFirst ? '★' : `#${i+1}`; rank.className = `bar-rank${isFirst ? ' is-first' : ''}`; }
    if (pct)   pct.textContent = total > 0 ? Math.round(person.v / total * 100) + '%' : '';
    if (row)   { row.classList.toggle('is-first', isFirst); row.classList.toggle('zero', person.v === 0); }
  });

  const newOrder = list.map(p => p.name);
  if (newOrder.some((n, i) => prevOrder[i] !== n)) {
    list.forEach(person => {
      const row = area.querySelector(`.bar-row[data-p="${person.name}"]`);
      if (row) area.appendChild(row);
    });
  }
  prevOrder = newOrder;
}

function setFill(area, person, maxV) {
  const fill = area.querySelector(`.bar-fill[data-p="${person.name}"]`);
  if (!fill) return;
  fill.style.width = `${Math.max(maxV > 0 ? (person.v / maxV) * 100 : 0, person.v > 0 ? 1.5 : 0)}%`;
}

function makeRow(person, i, total, maxV) {
  const isFirst  = i === 0;
  const shareStr = total > 0 ? Math.round(person.v / total * 100) + '%' : '';

  const row = document.createElement('div');
  row.className = `bar-row${isFirst ? ' is-first' : ''}${person.v === 0 ? ' zero' : ''}`;
  row.dataset.p = person.name;

  row.innerHTML = `
    <div class="bar-rank${isFirst ? ' is-first' : ''}" data-p="${person.name}">${isFirst ? '★' : `#${i+1}`}</div>
    <div class="bar-track">
      <div class="bar-fill" data-p="${person.name}" style="background:${COLORS[person.name]};width:0%"></div>
      <div class="bar-label">
        <span class="bar-name">${person.name.toLowerCase()}</span>
        <span class="bar-pct" data-p="${person.name}">${shareStr}</span>
      </div>
    </div>
    <div class="bar-count" data-p="${person.name}">${person.v}</div>
  `;

  return row;
}

// ================================================
// LOAD + UPDATE
// ================================================

async function loadVotes() {
  const btn = document.getElementById('refresh-btn');
  if (btn) btn.classList.add('spinning');

  const votes = await fetchVotes();
  if (votes) setUpdated();
  renderChart(votes);

  if (btn) btn.classList.remove('spinning');
}

function setUpdated() {
  const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  ['last-updated-main','last-updated-stats'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = `updated ${t}`;
  });
}

// ================================================
// VIEWS
// ================================================

function showStats() {
  document.getElementById('view-main').classList.add('view-left');
  const stats = document.getElementById('view-stats');
  stats.classList.remove('view-right');
  stats.classList.add('view-active');
  if (!chartRendered) loadVotes();
}

function showMain() {
  document.getElementById('view-main').classList.remove('view-left');
  const stats = document.getElementById('view-stats');
  stats.classList.remove('view-active');
  stats.classList.add('view-right');
}

// ================================================
// INIT
// ================================================

document.addEventListener('DOMContentLoaded', () => {
  tick();
  setInterval(tick, 1000);

  document.getElementById('stats-btn').addEventListener('click', showStats);
  document.getElementById('back-btn').addEventListener('click', showMain);
  document.getElementById('refresh-btn').addEventListener('click', loadVotes);

  // background fetch so timestamp shows on main screen
  fetchVotes().then(v => { if (v) setUpdated(); });

  // auto-refresh every 60s
  setInterval(async () => {
    const v = await fetchVotes();
    if (!v) return;
    setUpdated();
    if (document.getElementById('view-stats').classList.contains('view-active')) {
      renderChart(v);
    }
  }, 60_000);
});
