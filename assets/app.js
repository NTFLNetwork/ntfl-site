
const CONFIG = window.NTFL_CONFIG || {};
const SEED = window.NTFL_SEED || {};
const STORAGE_KEY = 'ntfl-site-state-v5';
const SESSION_KEY = 'ntfl-session-v5';
const APP_VERSION = 'v5';
const PAGE_TITLES = {
  index: 'NTFL Network — Season 3',
  teams: 'Teams — NTFL Network',
  team: 'Team — NTFL Network',
  schedule: 'Schedule — NTFL Network',
  standings: 'Standings — NTFL Network',
  rankings: 'Rankings — NTFL Network',
  news: 'News — NTFL Network',
  gamecenter: 'Game Center — NTFL Network',
  game: 'Game — NTFL Network',
  awards: 'Awards — NTFL Network',
  history: 'History — NTFL Network',
  rules: 'Rules — NTFL Network',
  commissioner: 'Commissioner Dashboard — NTFL Network',
  notfound: 'Page Not Found — NTFL Network',
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = loadState();
let supabaseClient = null;
try {
  if (window.supabase?.createClient && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) {
    supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  }
} catch (e) {
  console.warn('Supabase init skipped', e);
}

async function boot() {
  setupCommonShell();
  const page = document.body.dataset.page || 'index';
  setPageTitle(page);
  await hydrateRemote();
  if (page === 'index') renderIndex();
  else if (page === 'teams') renderTeams();
  else if (page === 'team') renderTeam();
  else if (page === 'schedule') renderSchedule();
  else if (page === 'standings') renderStandings();
  else if (page === 'rankings') renderRankings();
  else if (page === 'news') renderNews();
  else if (page === 'gamecenter') renderGameCenter();
  else if (page === 'game') renderGame();
  else if (page === 'awards') renderAwards();
  else if (page === 'history') renderHistory();
  else if (page === 'rules') renderRules();
  else if (page === 'commissioner') await renderCommissioner();
  else if (page === 'notfound') renderNotFound();
  else renderIndex();
  restoreFlash();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(SEED);
  try {
    const parsed = JSON.parse(saved);
    return deepMerge(structuredClone(SEED), parsed);
  } catch {
    return structuredClone(SEED);
  }
}

function saveState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function deepMerge(base, next) {
  if (Array.isArray(base) && Array.isArray(next)) return next;
  if (base && typeof base === 'object' && next && typeof next === 'object') {
    const out = { ...base };
    for (const key of Object.keys(next)) out[key] = deepMerge(base[key], next[key]);
    return out;
  }
  return next ?? base;
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function teamPageHref(name) {
  return CONFIG.teamPages?.[name] || `team-${slugify(name)}.html`;
}

function currentGameHref(id) {
  return `game.html?game=${encodeURIComponent(id)}`;
}

function setHTML(id, html) {
  const node = $(id);
  if (node) node.innerHTML = html;
}

function setPageTitle(page) {
  document.title = PAGE_TITLES[page] || PAGE_TITLES.index;
}

function getTickerText() {
  return state.settings?.ticker || SEED.settings?.ticker || 'NTFL updates';
}

function tickerMarkup() {
  const t = escapeHtml(getTickerText());
  return `<div class="ticker ticker-strip" aria-label="Live NTFL ticker"><div class="ticker-track"><span>LIVE • ${t}</span><span>LIVE • ${t}</span><span>LIVE • ${t}</span></div></div>`;
}

function ensureToastHost() {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  return host;
}

function notify(message, type = 'success') {
  const host = ensureToastHost();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 260);
  }, 2400);
}

function restoreFlash() {
  const flash = sessionStorage.getItem('ntfl-flash-message');
  if (flash) {
    sessionStorage.removeItem('ntfl-flash-message');
    notify(flash, 'success');
  }
}

function flash(message) {
  sessionStorage.setItem('ntfl-flash-message', message);
}

function setFlashAndNotify(message, type = 'success') {
  flash(message);
  notify(message, type);
}

function activeClass(href) {
  const current = location.pathname.split('/').pop() || 'index.html';
  return current === href ? ' active' : '';
}

function pageWrap(inner) {
  const app = $('#app');
  app.innerHTML = `
    <div class="shell">
      ${header()}
      <div class="container">${tickerMarkup()}</div>
      <main class="container">
        ${inner}
      </main>
      <div class="container footer">NTFL Network • ${SEED.settings?.season || 'Season 3'} • Built for a dark, modern, editable league experience. <span class="footer-version">${APP_VERSION}</span></div>
    </div>
  `;
  wireNav();
}

function header() {
  const page = document.body.dataset.page || 'index';
  return `
  <header class="topbar">
    <div class="container inner">
      <a class="brand" href="index.html" aria-label="NTFL Network home">
        <img src="assets/ntfl-logo.png" alt="NTFL logo">
        <div>
          <div class="title">${SEED.settings?.leagueName || 'NTFL Network'}</div>
          <div class="season">${SEED.settings?.season || 'Season 3'}</div>
        </div>
      </a>

      <nav class="nav">
        <a class="nav-link${page === 'index' ? ' active' : ''}" href="index.html">Home</a>
        ${dropdown('Teams', teamsMenu())}
        ${dropdown('League', leagueMenu())}
        ${dropdown('Media', mediaMenu())}
        ${dropdown('More', moreMenu())}
        ${dropdown('Commissioner', commissionerMenu())}
      </nav>

      <button class="mobile-toggle" id="mobileToggle" aria-label="Open menu">☰</button>
    </div>
    <div class="container mobile-nav" id="mobileNav">
      ${mobileGroups()}
    </div>
  </header>`;
}

function dropdown(label, items) {
  return `
  <div class="dropdown">
    <button class="nav-btn">${label} ▾</button>
    <div class="dropdown-menu">${items}</div>
  </div>`;
}

function teamsMenu() {
  return Object.entries(SEED.divisionTeams || {}).map(([division, teams]) => (
    `<button data-filter="${division}">${division}</button>`
  )).join('') + `<a href="teams.html"><span>All Teams</span><span>↗</span></a>`;
}
function leagueMenu() {
  return ['Schedule','Standings','Power Rankings','Game Center','Playoff Picture','League Leaders']
    .map(item => `<a href="${hrefFor(item)}"><span>${item}</span><span>↗</span></a>`).join('');
}
function mediaMenu() {
  return ['News','Articles','Interviews','Weekly Recaps','Highlights']
    .map(item => `<a href="${hrefFor(item)}"><span>${item}</span><span>↗</span></a>`).join('');
}
function moreMenu() {
  return ['Awards','History','Hall of Fame','Rules','About']
    .map(item => `<a href="${hrefFor(item)}"><span>${item}</span><span>↗</span></a>`).join('');
}
function commissionerMenu() {
  return ['Dashboard','Edit Standings','Update Schedule','Manage Teams','Upload Logos','Edit Coaches','Edit Rankings','Publish News']
    .map(item => `<a href="commissioner.html"><span>${item}</span><span>↗</span></a>`).join('');
}
function hrefFor(item){
  const map = {
    Schedule:'schedule.html',
    Standings:'standings.html',
    'Power Rankings':'rankings.html',
    'Game Center':'gamecenter.html',
    'Playoff Picture':'history.html',
    'League Leaders':'rankings.html',
    News:'news.html',
    Articles:'news.html',
    Interviews:'news.html',
    'Weekly Recaps':'news.html',
    Highlights:'news.html',
    Awards:'awards.html',
    History:'history.html',
    'Hall of Fame':'history.html',
    Rules:'rules.html',
    About:'index.html'
  };
  return map[item] || 'index.html';
}
function mobileGroups() {
  const groups = [
    ['Teams', ['All Teams', ...Object.keys(SEED.divisionTeams || {})]],
    ['League', ['Schedule', 'Standings', 'Power Rankings', 'Game Center', 'Playoff Picture', 'League Leaders']],
    ['Media', ['News', 'Articles', 'Interviews', 'Weekly Recaps', 'Highlights']],
    ['More', ['Awards', 'History', 'Hall of Fame', 'Rules', 'About']],
    ['Commissioner', ['Dashboard', 'Edit Standings', 'Update Schedule', 'Manage Teams', 'Upload Logos', 'Edit Coaches', 'Edit Rankings', 'Publish News']],
  ];
  return groups.map(([label, items]) => `
    <div class="group">
      <h4>${label}</h4>
      <div class="grid">
        ${items.map(i => `<a href="${hrefFor(i)}">${i}</a>`).join('')}
      </div>
    </div>`).join('');
}

function wireNav() {
  const mobileToggle = $('#mobileToggle');
  const mobileNav = $('#mobileNav');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => mobileNav.classList.toggle('open'));
  }
  $$('.dropdown .nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.dropdown');
      const isOpen = parent.classList.contains('open');
      $$('.dropdown').forEach(d => d.classList.remove('open'));
      if (!isOpen) parent.classList.add('open');
    });
  });
  document.addEventListener('click', () => $$('.dropdown').forEach(d => d.classList.remove('open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.dropdown').forEach(d => d.classList.remove('open'));
      mobileNav?.classList.remove('open');
    }
  });
}

function setupCommonShell() {
  document.body.classList.add('ntfl-app');
}

function heroCard() {
  return `
    <section class="banner">
      <div class="hero">
        <div class="hero-inner">
          <div>
            <div class="badges">
              <span class="badge">Ravens won S1 &amp; S2</span>
              <span class="badge">Dark modern theme</span>
              <span class="badge">Editable without code</span>
            </div>
            <h1>${state.settings.headline}</h1>
            <p>${state.settings.subhead}</p>
            <div class="actions">
              <a class="btn primary" href="gamecenter.html">Open Game Center</a>
              <a class="btn secondary" href="commissioner.html">Commissioner Dashboard</a>
            </div>
            <div class="grid three" style="margin-top:18px">
              ${stat('Teams', '32')}
              ${stat('Season', '3')}
              ${stat('Champions', 'Ravens')}
            </div>
          </div>
          <div class="hero-side">
            <div class="card panel">
              <div class="section-title" style="margin-bottom:8px">
                <div>
                  <div class="eyebrow">Game of the Week</div>
                  <h2 style="margin-top:4px">${state.settings.featuredGame}</h2>
                </div>
                <span class="pill live">LIVE</span>
              </div>
              <div class="small">${state.settings.featuredTime}</div>
              <hr class="sep">
              <div class="small">${state.settings.featuredNote}</div>
              <div class="actions" style="margin-top:14px">
                <span class="pill">Featured matchup</span>
                <span class="pill">${state.settings.ticker}</span>
              </div>
            </div>
            <div class="ticker">
              <div class="ticker-track">
                <span>LIVE • ${state.settings.ticker}</span>
                <span>LIVE • ${state.settings.ticker}</span>
                <span>LIVE • ${state.settings.ticker}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function stat(label, value) {
  return `<div class="card stat"><div><div class="k">${label}</div><div class="v">${value}</div></div></div>`;
}

function renderIndex() {
  pageWrap(`
    ${heroCard()}
    <section class="section">
      <div class="section-title">
        <div><div class="eyebrow">League snapshot</div><h2>Fast access to the biggest NTFL features</h2></div>
      </div>
      <div class="grid four">
        ${cardLink('Schedule', 'View weekly matchups and results.', 'schedule.html')}
        ${cardLink('Standings', 'Track divisional records and win percentage.', 'standings.html')}
        ${cardLink('Rankings', 'Editable top ten power rankings.', 'rankings.html')}
        ${cardLink('News', 'League updates, recaps, and headlines.', 'news.html')}
      </div>
    </section>
    <section class="section">
      <div class="section-title"><div><div class="eyebrow">Live scoreboard</div><h2>Featured games</h2></div></div>
      <div class="grid two">
        ${state.games.map(g => gameCard(g)).join('')}
      </div>
    </section>
    <section class="section">
      <div class="section-title"><div><div class="eyebrow">Power rankings</div><h2>Top 10 board</h2></div><a class="pill" href="rankings.html">Open rankings</a></div>
      <div class="card panel">
        <table class="table">
          <thead><tr><th>#</th><th>Team</th><th>Record</th><th>Note</th></tr></thead>
          <tbody>
            ${state.rankings.map(r => `<tr><td>${r.rank}</td><td><a href="${teamPageHref(r.team)}">${r.team}</a></td><td>${r.record}</td><td>${r.note}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>
    <section class="section">
      <div class="section-title"><div><div class="eyebrow">Latest news</div><h2>Recent headlines</h2></div><a class="pill" href="news.html">All news</a></div>
      <div class="grid two">
        ${state.news.map(n => articleCard(n)).join('')}
      </div>
    </section>
  `);
}

function cardLink(title, text, href) {
  return `<a class="card panel" href="${href}" style="display:block"><div class="kicker">${title}</div><h3 style="margin:10px 0 6px">${text}</h3><div class="small">Open page ↗</div></a>`;
}

function gameCard(g) {
  const cls = g.status.toLowerCase();
  return `
    <a class="card panel" href="${currentGameHref(g.id)}">
      <div class="section-title" style="margin-bottom:8px">
        <div><div class="kicker">${g.note}</div><h2 style="margin-top:4px">${g.title}</h2></div>
        <span class="pill ${cls}">${g.status}</span>
      </div>
      <div class="small">${g.time}</div>
      <hr class="sep">
      <div class="small">Score: <strong style="color:#fff">${g.score}</strong></div>
    </a>`;
}

function articleCard(n) {
  return `<div class="card article">
    <div class="kicker">${n.category}</div>
    <h3>${n.title}</h3>
    <div class="meta">${n.date}</div>
    <p class="small">${n.body}</p>
  </div>`;
}

function renderTeams() {
  const teamsHtml = state.teams.map(team => `
    <a class="card team-card" href="${teamPageHref(team.name)}">
      <div class="team-top">
        <div class="team-logo">${team.logoLetter}</div>
        <div>
          <div style="font-weight:800">${team.name}</div>
          <div class="small">${team.division}</div>
        </div>
      </div>
      <div class="details">
        <div class="line"><span>Coach</span><span>${team.coach}</span></div>
        <div class="line"><span>Record</span><span>${team.record}</span></div>
      </div>
    </a>`).join('');
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">Teams</div><h2>All 32 NFL teams in the NTFL</h2></div></div>
      <div class="grid four">${teamsHtml}</div>
    </section>
  `);
}

function renderTeam() {
  const teamName = document.body.dataset.team;
  const team = state.teams.find(t => t.name === teamName) || state.teams[0];
  const division = team.division;
  const divisionSchedule = state.schedule[division] || [];
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="card panel logo-box">
        <div style="display:flex;align-items:center;gap:16px">
          <div class="team-logo" style="width:90px;height:90px;font-size:2rem">${team.logoLetter}</div>
          <div>
            <div class="kicker">${team.division}</div>
            <h2 style="margin:6px 0 6px">${team.name}</h2>
            <div class="small">Coach: ${team.coach} • Record: ${team.record}</div>
          </div>
        </div>
        <a class="btn secondary" href="teams.html">Back to teams</a>
      </div>
    </section>
    <section class="section">
      <div class="grid two">
        <div class="card panel">
          <div class="section-title"><div><div class="eyebrow">Team profile</div><h2>${team.name}</h2></div></div>
          <div class="details">
            <div class="line"><span>Division</span><span>${team.division}</span></div>
            <div class="line"><span>Coach</span><span>${team.coach}</span></div>
            <div class="line"><span>Record</span><span>${team.record}</span></div>
            <div class="line"><span>Theme</span><span>Editable in commissioner dashboard</span></div>
          </div>
        </div>
        <div class="card panel">
          <div class="section-title"><div><div class="eyebrow">Upcoming schedule</div><h2>${team.division}</h2></div></div>
          <div class="small">This page is set up for team-specific updates, coach changes, and future uploads.</div>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="section-title"><div><div class="eyebrow">Schedule</div><h2>${division} weekly games</h2></div></div>
      <div class="card panel">
        ${divisionSchedule.slice(0, 5).map(week => `
          <div class="card panel" style="margin-bottom:12px">
            <div class="section-title" style="margin-bottom:10px">
              <div><div class="kicker">Week ${String(week.week).replace('W','')}</div><h2>${week.week}</h2></div>
            </div>
            <div class="grid two">
              ${week.matchups.map(m => `<div class="card panel"><strong>${m.team}</strong><div class="small" style="margin-top:6px">${m.detail}</div></div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </section>
  `);
}

function renderSchedule() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">Schedule</div><h2>Weekly matchups by division</h2></div></div>
      <div class="grid">
        ${Object.entries(state.schedule).map(([division, weeks]) => `
          <div class="card panel">
            <div class="section-title">
              <div><div class="kicker">${division}</div><h2>${division} schedule</h2></div>
              <a class="pill" href="teams.html">${division}</a>
            </div>
            <div class="grid">
              ${weeks.slice(0, 4).map(week => `
                <div class="card panel">
                  <div class="section-title" style="margin-bottom:10px">
                    <div><div class="kicker">Week ${String(week.week).replace('W','')}</div><h2>${week.week}</h2></div>
                    <span class="pill scheduled">Scheduled</span>
                  </div>
                  <div class="grid two">
                    ${week.matchups.map(m => `<div class="small"><strong>${m.team}</strong><br>${m.detail}</div>`).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `);
}


function recordPct(record) {
  const match = String(record || '').trim().match(/^(\d+)-(\d+)(?:-(\d+))?$/);
  if (!match) return '—';
  const wins = Number(match[1]);
  const losses = Number(match[2]);
  const ties = Number(match[3] || 0);
  const games = wins + losses + ties;
  if (!games) return '—';
  const pct = ((wins + ties * 0.5) / games).toFixed(3);
  return `.${pct.split('.')[1]}`;
}

function renderStandings() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">Standings</div><h2>Division tables</h2></div></div>
      <div class="grid">
        ${Object.entries(SEED.divisionTeams).map(([division, teams]) => {
          const rows = teams.map(t => state.teams.find(x => x.name === t) || {name:t, record:'0-0', coach:'TBD'}).map((t)=>({
            team:t.name, record:t.record, coach:t.coach, pf:0, pa:0, pct:recordPct(t.record), streak:'—'
          }));
          return `
            <div class="card panel">
              <div class="section-title">
                <div><div class="kicker">${division}</div><h2>${division} standings</h2></div>
                <span class="pill">Editable</span>
              </div>
              <table class="table">
                <thead><tr><th>Team</th><th>Coach</th><th>Record</th><th>Win %</th></tr></thead>
                <tbody>${rows.map(r => `<tr><td><a href="${teamPageHref(r.team)}">${r.team}</a></td><td>${r.coach}</td><td>${r.record}</td><td>${r.pct}</td></tr>`).join('')}</tbody>
              </table>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `);
}

function renderRankings() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">Rankings</div><h2>Top 10 power rankings</h2></div></div>
      <div class="card panel">
        <table class="table">
          <thead><tr><th>#</th><th>Team</th><th>Record</th><th>Note</th></tr></thead>
          <tbody>${state.rankings.map(r => `<tr><td>${r.rank}</td><td><a href="${teamPageHref(r.team)}">${r.team}</a></td><td>${r.record}</td><td>${r.note}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>
  `);
}

function renderNews() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">News</div><h2>League headlines</h2></div></div>
      <div class="grid two">${state.news.map(articleCard).join('')}</div>
    </section>
  `);
}

function renderGameCenter() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">Game Center</div><h2>Live, final, and scheduled matchups</h2></div><a class="pill" href="commissioner.html">Update games</a></div>
      <div class="grid two">${state.games.map(gameCard).join('')}</div>
    </section>
  `);
}

function renderGame() {
  const params = new URLSearchParams(location.search);
  const id = params.get('game') || 'gw1';
  const g = state.games.find(x => x.id === id) || state.games[0];
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="card panel">
        <div class="section-title">
          <div><div class="eyebrow">Game Center</div><h2>${g.title}</h2></div>
          <span class="pill ${g.status.toLowerCase()}">${g.status}</span>
        </div>
        <div class="grid two">
          <div class="card panel">
            <div class="kicker">Status</div>
            <h3>${g.time}</h3>
            <p class="small">Score: <strong style="color:#fff">${g.score}</strong></p>
          </div>
          <div class="card panel">
            <div class="kicker">Notes</div>
            <h3>${g.note}</h3>
            <p class="small">This page is ready for live updates, recap text, MVP selections, and future box score blocks.</p>
          </div>
        </div>
      </div>
    </section>
  `);
}

function renderAwards() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">Awards</div><h2>Editable award spots</h2></div></div>
      <div class="grid three">
        ${state.awards.map(a => `<div class="card panel"><h3>${a}</h3><p class="small">Add winners, nominees, and weekly notes from the commissioner dashboard.</p></div>`).join('')}
      </div>
    </section>
  `);
}

function renderHistory() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">History</div><h2>NTFL season archive</h2></div></div>
      <div class="grid">
        ${state.history.map(h => `<div class="card panel"><div class="section-title" style="margin-bottom:0"><div><div class="kicker">${h.season}</div><h2>${h.champion}</h2></div><span class="pill">${h.note}</span></div></div>`).join('')}
      </div>
    </section>
  `);
}

function renderRules() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">Rules</div><h2>League handbook</h2></div></div>
      <div class="grid">
        ${state.rules.map(r => `<div class="card panel"><h3>${r.title}</h3><p class="small">${r.text}</p></div>`).join('')}
      </div>
    </section>
  `);
}

function renderNotFound() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="card panel" style="text-align:center;padding:44px 24px">
        <div class="kicker">404</div>
        <h1 style="margin:12px 0 10px">Page not found</h1>
        <p class="small">The page you were looking for is not here. Use the links above to get back to the NTFL site.</p>
        <div class="actions" style="justify-content:center">
          <a class="btn primary" href="index.html">Return home</a>
          <a class="btn secondary" href="gamecenter.html">Open Game Center</a>
        </div>
      </div>
    </section>
  `);
}

async function renderCommissioner() {
  pageWrap(`
    <section class="section banner" style="padding-top:28px">
      <div class="section-title"><div><div class="eyebrow">Commissioner</div><h2>Dashboard</h2></div></div>
      <div class="card panel" id="authBox"></div>
      <div id="dashboardArea" class="grid hidden"></div>
    </section>
  `);

  const authBox = $('#authBox');
  const dashboardArea = $('#dashboardArea');

  async function refreshSession() {
    if (!supabaseClient) {
      authBox.innerHTML = `<div class="small">Supabase client unavailable. Check config.js.</div>`;
      return null;
    }
    const { data } = await supabaseClient.auth.getSession();
    const session = data?.session || null;
    if (!session) {
      authBox.innerHTML = loginForm();
      wireLogin();
      dashboardArea.classList.add('hidden');
      return null;
    }
    authBox.innerHTML = `<div class="small">Signed in as <strong>${session.user.email || session.user.id}</strong></div>
      <div class="actions" style="margin-top:12px"><button class="btn secondary" id="logoutBtn">Log out</button></div>`;
    $('#logoutBtn').addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      location.reload();
    });
    dashboardArea.classList.remove('hidden');
    renderDashboardEditor(dashboardArea);
    return session;
  }

  await refreshSession();
}

function loginForm() {
  return `
    <div class="grid two">
      <div>
        <div class="kicker">Sign in</div>
        <h3>Commissioner access</h3>
        <p class="small">Use your Supabase Auth account to edit everything.</p>
      </div>
      <div class="editor">
        <div class="row">
          <input id="loginEmail" type="email" placeholder="Email">
          <input id="loginPassword" type="password" placeholder="Password">
          <div class="toolbar">
            <button class="btn primary" id="loginBtn">Sign in</button>
          </div>
          <div class="small" id="loginMsg"></div>
        </div>
      </div>
    </div>`;
}

function wireLogin() {
  $('#loginBtn')?.addEventListener('click', async () => {
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    const msg = $('#loginMsg');
    msg.textContent = 'Signing in...';
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) msg.textContent = error.message;
    else location.reload();
  });
}

function renderDashboardEditor(root) {
  root.innerHTML = `
    <div class="card panel editor">
      <div class="section-title"><div><div class="eyebrow">Backup</div><h2>Export / import your NTFL state</h2></div></div>
      <div class="actions">
        <button class="btn primary" id="exportStateBtn">Export backup</button>
        <button class="btn secondary" id="importStateBtn">Import backup</button>
        <button class="btn secondary" id="resetStateBtn">Reset to seed</button>
        <input id="importStateFile" type="file" accept="application/json" class="hidden">
      </div>
      <div class="small">Use backups before making major updates. Export saves the current browser state to a JSON file. Import restores a previous backup.</div>
    </div>
    <div class="grid two">
      ${settingsEditor()}
      ${featuredEditor()}
    </div>
    <div class="grid two">
      ${teamsEditor()}
      ${rankingsEditor()}
    </div>
    <div class="grid two">
      ${gamesEditor()}
      ${newsEditor()}
    </div>
    <div class="grid two">
      ${historyEditor()}
      ${rulesEditor()}
    </div>
  `;
  wireEditors();
  wireBackupTools();
}

function settingsEditor() {
  return `
  <div class="card panel editor">
    <div class="section-title"><div><div class="eyebrow">Homepage</div><h2>Site settings</h2></div></div>
    <div class="row">
      <input id="setHeadline" value="${escapeHtml(state.settings.headline)}">
      <textarea id="setSubhead">${escapeHtml(state.settings.subhead)}</textarea>
      <input id="setGame" value="${escapeHtml(state.settings.featuredGame)}">
      <input id="setTime" value="${escapeHtml(state.settings.featuredTime)}">
      <textarea id="setNote">${escapeHtml(state.settings.featuredNote)}</textarea>
      <input id="setTicker" value="${escapeHtml(state.settings.ticker)}">
      <div class="toolbar">
        <button class="btn primary" id="saveSettings">Save settings</button>
      </div>
    </div>
  </div>`;
}

function featuredEditor() {
  return `
  <div class="card panel editor">
    <div class="section-title"><div><div class="eyebrow">Game Center</div><h2>Featured games</h2></div></div>
    <div class="small">Edit live / scheduled / final labels from here.</div>
    <div class="row">
      ${state.games.map((g, i) => `
        <div class="card panel" style="padding:14px">
          <div class="row two">
            <input data-game-field="title" data-index="${i}" value="${escapeHtml(g.title)}">
            <input data-game-field="status" data-index="${i}" value="${escapeHtml(g.status)}">
          </div>
          <div class="row two">
            <input data-game-field="time" data-index="${i}" value="${escapeHtml(g.time)}">
            <input data-game-field="score" data-index="${i}" value="${escapeHtml(g.score)}">
          </div>
          <textarea data-game-field="note" data-index="${i}">${escapeHtml(g.note)}</textarea>
        </div>
      `).join('')}
      <div class="toolbar">
        <button class="btn primary" id="saveGames">Save games</button>
      </div>
    </div>
  </div>`;
}

function teamsEditor() {
  return `
  <div class="card panel editor">
    <div class="section-title"><div><div class="eyebrow">Teams</div><h2>Coach and record editor</h2></div></div>
    <div class="row">
      ${state.teams.map((t, i) => `
        <div class="card panel" style="padding:14px">
          <div style="font-weight:800">${t.name} <span class="small">(${t.division})</span></div>
          <div class="row two" style="margin-top:10px">
            <input data-team-field="coach" data-index="${i}" value="${escapeHtml(t.coach)}">
            <input data-team-field="record" data-index="${i}" value="${escapeHtml(t.record)}">
          </div>
        </div>
      `).join('')}
      <div class="toolbar">
        <button class="btn primary" id="saveTeams">Save teams</button>
      </div>
      <div class="small">This editor includes every team so coach names and records can be updated without touching code.</div>
    </div>
  </div>`;
}

function rankingsEditor() {
  return `
  <div class="card panel editor">
    <div class="section-title"><div><div class="eyebrow">Rankings</div><h2>Top 10 editor</h2></div></div>
    <div class="row">
      ${state.rankings.map((r, i) => `
        <div class="card panel" style="padding:14px">
          <div style="font-weight:800">#${r.rank}</div>
          <div class="row two" style="margin-top:10px">
            <input data-rank-field="team" data-index="${i}" value="${escapeHtml(r.team)}">
            <input data-rank-field="record" data-index="${i}" value="${escapeHtml(r.record)}">
          </div>
          <input data-rank-field="note" data-index="${i}" value="${escapeHtml(r.note)}" style="margin-top:10px">
        </div>
      `).join('')}
      <div class="toolbar">
        <button class="btn primary" id="saveRankings">Save rankings</button>
      </div>
    </div>
  </div>`;
}

function gamesEditor() {
  return `
  <div class="card panel editor">
    <div class="section-title"><div><div class="eyebrow">Game Center</div><h2>Live status</h2></div></div>
    <div class="small">Toggle game status text, score, and notes.</div>
    <div class="toolbar">
      <button class="btn primary" id="saveAll">Save changes</button>
    </div>
  </div>`;
}

function newsEditor() {
  return `
  <div class="card panel editor">
    <div class="section-title"><div><div class="eyebrow">News</div><h2>Headlines</h2></div></div>
    <div class="small">Use the public news section for league updates and recaps.</div>
  </div>`;
}

function historyEditor() {
  return `
  <div class="card panel editor">
    <div class="section-title"><div><div class="eyebrow">History</div><h2>Season archive</h2></div></div>
    <div class="small">Ravens won Season 1 and Season 2.</div>
  </div>`;
}

function rulesEditor() {
  return `
  <div class="card panel editor">
    <div class="section-title"><div><div class="eyebrow">Rules</div><h2>League handbook</h2></div></div>
    <div class="small">Rules are editable text, not images.</div>
  </div>`;
}

function wireBackupTools() {
  $('#exportStateBtn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ntfl-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Backup exported.');
  });
  $('#importStateBtn')?.addEventListener('click', () => $('#importStateFile')?.click());
  $('#importStateFile')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const merged = deepMerge(structuredClone(SEED), parsed);
      Object.assign(state, merged);
      saveAll();
      notify('Backup imported. Refreshing.');
      location.reload();
    } catch (err) {
      console.error(err);
      notify('Import failed. Check the file format.', 'error');
    }
  });
  $('#resetStateBtn')?.addEventListener('click', () => {
    if (!confirm('Reset NTFL content back to the seeded default data?')) return;
    const fresh = structuredClone(SEED);
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, fresh);
    saveAll();
    notify('State reset to seed data.');
    location.reload();
  });
}

function wireEditors() {
  $('#saveSettings')?.addEventListener('click', async () => {
    state.settings.headline = $('#setHeadline').value;
    state.settings.subhead = $('#setSubhead').value;
    state.settings.featuredGame = $('#setGame').value;
    state.settings.featuredTime = $('#setTime').value;
    state.settings.featuredNote = $('#setNote').value;
    state.settings.ticker = $('#setTicker').value;
    saveAll();
    notify('Homepage settings saved.');
  });

  $('#saveGames')?.addEventListener('click', async () => {
    $$('.editor [data-game-field]').forEach(input => {
      const idx = Number(input.dataset.index);
      const field = input.dataset.gameField;
      state.games[idx][field] = input.value;
    });
    saveAll();
    notify('Game updates saved.');
  });

  $('#saveTeams')?.addEventListener('click', async () => {
    $$('.editor [data-team-field]').forEach(input => {
      const idx = Number(input.dataset.index);
      const field = input.dataset.teamField;
      if (state.teams[idx]) state.teams[idx][field] = input.value;
    });
    saveAll();
    notify('Team updates saved.');
  });

  $('#saveRankings')?.addEventListener('click', async () => {
    $$('.editor [data-rank-field]').forEach(input => {
      const idx = Number(input.dataset.index);
      const field = input.dataset.rankField;
      state.rankings[idx][field] = input.value;
    });
    saveAll();
    notify('Rankings saved.');
  });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function saveAll() {
  saveState(state);
  // Save to Supabase when authenticated, best effort.
  syncToSupabase().catch(err => console.warn('Supabase sync failed', err));
}

async function hydrateRemote() {
  // Prefer saved browser edits to avoid surprises, but sync from Supabase if local cache is empty.
  if (!supabaseClient) return;
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const session = sessionData?.session;
    if (!session) return;
    // Best-effort reads. If your milestone 1 schema exists, these will populate.
    const [settingsRes, teamsRes, rankingsRes, newsRes, historyRes, rulesRes, gamesRes] = await Promise.all([
      supabaseClient.from('settings').select('*').order('updated_at', { ascending: false }).limit(1),
      supabaseClient.from('teams').select('*').order('division').order('name'),
      supabaseClient.from('rankings').select('*').order('rank'),
      supabaseClient.from('news').select('*').order('published_at', { ascending: false }),
      supabaseClient.from('history').select('*').order('season', { ascending: true }),
      supabaseClient.from('rules').select('*').order('sort_order', { ascending: true }),
      supabaseClient.from('games').select('*').order('week', { ascending: true }),
    ]);

    if (!settingsRes.error && settingsRes.data?.[0]) {
      const s = settingsRes.data[0];
      state.settings = { ...state.settings, ...pick(s, ['headline','subhead','featured_game','featured_time','featured_note','ticker']) };
      state.settings.featuredGame = s.featured_game ?? state.settings.featuredGame;
      state.settings.featuredTime = s.featured_time ?? state.settings.featuredTime;
      state.settings.featuredNote = s.featured_note ?? state.settings.featuredNote;
      state.settings.ticker = s.ticker ?? state.settings.ticker;
    }
    if (!teamsRes.error && teamsRes.data?.length) {
      state.teams = teamsRes.data.map(t => ({
        name: t.name,
        division: t.division,
        coach: t.coach || 'TBD',
        record: t.record || '0-0',
        rank: t.rank ?? null,
        logoLetter: (t.logo_letter || t.name || 'T')[0],
        colorClass: 'from-slate-700 to-slate-900',
        accent: '#e2e8f0',
        slug: slugify(t.name),
      }));
    }
    if (!rankingsRes.error && rankingsRes.data?.length) {
      state.rankings = rankingsRes.data.map(r => ({
        rank: r.rank,
        team: r.team,
        record: r.record || '0-0',
        note: r.note || '',
      }));
    }
    if (!newsRes.error && newsRes.data?.length) {
      state.news = newsRes.data.map(n => ({
        title: n.title,
        date: n.published_at || 'News',
        category: n.category || 'League',
        body: n.body || '',
      }));
    }
    if (!historyRes.error && historyRes.data?.length) {
      state.history = historyRes.data.map(h => ({
        season: h.season,
        champion: h.champion,
        note: h.note || '',
      }));
    }
    if (!rulesRes.error && rulesRes.data?.length) {
      state.rules = rulesRes.data.map(r => ({ title: r.title, text: r.text }));
    }
    if (!gamesRes.error && gamesRes.data?.length) {
      state.games = gamesRes.data.map(g => ({
        id: g.id || slugify(g.title || g.matchup || 'game'),
        title: g.title || g.matchup,
        status: g.status || 'Scheduled',
        time: g.time || '',
        score: g.score || '-',
        note: g.note || '',
      }));
    }
    saveState(state);
  } catch (e) {
    console.warn('Remote hydrate failed', e);
  }
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] != null) out[k] = obj[k];
  return out;
}

async function syncToSupabase() {
  if (!supabaseClient) return;
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData?.session) return;

  // Best-effort upserts using the expected milestone 1 schema.
  await Promise.allSettled([
    upsertOne('settings', {
      id: 1,
      headline: state.settings.headline,
      subhead: state.settings.subhead,
      featured_game: state.settings.featuredGame,
      featured_time: state.settings.featuredTime,
      featured_note: state.settings.featuredNote,
      ticker: state.settings.ticker,
    }),
    bulkUpsert('teams', state.teams.map(t => ({
      name: t.name,
      division: t.division,
      coach: t.coach,
      record: t.record,
      logo_letter: t.logoLetter,
    }))),
    bulkUpsert('rankings', state.rankings.map(r => ({
      rank: r.rank,
      team: r.team,
      record: r.record,
      note: r.note,
    }))),
    bulkUpsert('news', state.news.map(n => ({
      title: n.title,
      category: n.category,
      body: n.body,
      published_at: n.date,
    }))),
    bulkUpsert('history', state.history.map(h => ({
      season: h.season,
      champion: h.champion,
      note: h.note,
    }))),
    bulkUpsert('rules', state.rules.map((r, i) => ({
      sort_order: i + 1,
      title: r.title,
      text: r.text,
    }))),
    bulkUpsert('games', state.games.map(g => ({
      id: g.id,
      title: g.title,
      status: g.status,
      time: g.time,
      score: g.score,
      note: g.note,
    }))),
  ]);
}

async function upsertOne(table, payload) {
  return supabaseClient.from(table).upsert(payload, { onConflict: 'id' });
}
async function bulkUpsert(table, rows) {
  if (!rows.length) return;
  return supabaseClient.from(table).upsert(rows, { onConflict: table === 'rankings' ? 'rank' : table === 'teams' ? 'name' : table === 'games' ? 'id' : undefined });
}

document.addEventListener('DOMContentLoaded', boot);
