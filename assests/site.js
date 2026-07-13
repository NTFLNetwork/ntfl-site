
(() => {
  const DEFAULT = window.NTFL_DEFAULT_DATA;
  const LS_KEY = "ntfl_state_v1";

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  const getState = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return mergeState(DEFAULT, JSON.parse(raw));
    } catch (e) {}
    return deepClone(DEFAULT);
  };

  const saveState = (state) => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  };

  const resetState = () => {
    localStorage.removeItem(LS_KEY);
    location.reload();
  };

  function mergeState(base, custom) {
    const state = deepClone(base);
    if (!custom || typeof custom !== "object") return state;

    state.site = { ...state.site, ...(custom.site || {}) };
    state.home = { ...state.home, ...(custom.home || {}) };
    if (Array.isArray(custom.teams)) state.teams = custom.teams;
    if (Array.isArray(custom.games)) state.games = custom.games;
    if (Array.isArray(custom.hof)) state.hof = custom.hof;
    if (Array.isArray(custom.history)) state.history = custom.history;
    if (Array.isArray(custom.weeks)) state.weeks = custom.weeks;
    if (Array.isArray(custom.divisions)) state.divisions = custom.divisions;
    return state;
  }

  const state = getState();

  function byName(name) {
    return state.teams.find(t => t.name === name);
  }

  function logo(name, size = 72) {
    const team = byName(name);
    const src = team?.logo || "";
    return src ? `<img src="${src}" alt="${name} logo" style="width:${size}px;height:${size}px;object-fit:contain;">` : `<div style="width:${size}px;height:${size}px;border-radius:18px;background:rgba(255,255,255,.07);display:grid;place-items:center;font-weight:900;">${name[0]}</div>`;
  }

  function weekNum(week) {
    const n = Number(String(week).replace(/\D+/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function gameLabel(g) {
    return `${g.away} @ ${g.home}`;
  }

  function gameDisplayScore(g) {
    if (g.homeScore === null || g.homeScore === undefined || g.awayScore === null || g.awayScore === undefined) return "Scheduled";
    return `${g.awayScore}-${g.homeScore}`;
  }

  function gameResultFor(team, g) {
    if (g.homeScore == null || g.awayScore == null) return { text: "Scheduled", cls: "badge" };
    let result = "T";
    if (g.homeScore > g.awayScore) result = (team === g.home) ? "W" : "L";
    if (g.awayScore > g.homeScore) result = (team === g.away) ? "W" : "L";
    const cls = result === "W" ? "badge green" : result === "L" ? "badge red" : "badge gold";
    return { text: result, cls };
  }

  function getTeamGames(name) {
    return state.games
      .filter(g => g.home === name || g.away === name)
      .sort((a, b) => weekNum(a.week) - weekNum(b.week) || a.id.localeCompare(b.id));
  }

  function computeStandings() {
    const stats = {};
    for (const t of state.teams) {
      stats[t.name] = {
        team: t.name,
        division: t.division,
        conference: t.conference,
        abbr: t.abbr,
        logo: t.logo,
        wins: 0,
        losses: 0,
        ties: 0,
        pf: 0,
        pa: 0,
        gamesPlayed: 0,
        last: []
      };
    }
    for (const g of state.games) {
      if (g.homeScore == null || g.awayScore == null) continue;
      const h = stats[g.home], a = stats[g.away];
      h.pf += Number(g.homeScore); h.pa += Number(g.awayScore); h.gamesPlayed += 1;
      a.pf += Number(g.awayScore); a.pa += Number(g.homeScore); a.gamesPlayed += 1;
      if (g.homeScore > g.awayScore) {
        h.wins += 1; a.losses += 1; h.last.push("W"); a.last.push("L");
      } else if (g.homeScore < g.awayScore) {
        h.losses += 1; a.wins += 1; h.last.push("L"); a.last.push("W");
      } else {
        h.ties += 1; a.ties += 1; h.last.push("T"); a.last.push("T");
      }
    }
    Object.values(stats).forEach(t => {
      if (!t.last.length) t.streak = "—";
      else {
        const cur = t.last[t.last.length - 1];
        let n = 1;
        for (let i = t.last.length - 2; i >= 0; i--) {
          if (t.last[i] === cur) n += 1; else break;
        }
        t.streak = `${cur}${n}`;
      }
      t.diff = t.pf - t.pa;
      t.record = `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}`;
      t.winPct = t.gamesPlayed ? (t.wins + t.ties * 0.5) / t.gamesPlayed : 0;
    });
    const ordered = Object.values(stats).sort((a, b) =>
      b.winPct - a.winPct ||
      b.wins - a.wins ||
      b.diff - a.diff ||
      b.pf - a.pf ||
      a.losses - b.losses ||
      a.team.localeCompare(b.team)
    );
    return { ordered, stats };
  }

  function renderTopbar(active) {
    const activeClass = (p) => p === active ? 'active' : '';
    return `
      <header class="topbar">
        <div class="wrap topbar-inner">
          <div class="brand">
            <div class="brand-badge">NT</div>
            <div>
              <h1>${state.site.name}</h1>
              <p>${state.site.tagline}</p>
            </div>
          </div>
          <nav class="nav">
            <a class="${activeClass('home')}" href="index.html">Home</a>
            <a class="${activeClass('teams')}" href="teams.html">Teams</a>
            <a class="${activeClass('schedule')}" href="schedule.html">Schedule</a>
            <a class="${activeClass('standings')}" href="standings.html">Standings</a>
            <a class="${activeClass('hof')}" href="hof.html">Hall of Fame</a>
            <a class="${activeClass('history')}" href="history.html">History</a>
            <a class="${activeClass('admin')}" href="admin.html">Admin</a>
          </nav>
        </div>
      </header>`;
  }

  function renderFooter() {
    return `
      <footer class="footer wrap">
        <div>NTFL Network is a fan-built league hub. All edits can be made from the admin page on the same device via local storage, with export/import built in.</div>
      </footer>`;
  }

  function heroBlock() {
    const featured = state.games.find(g => g.id === state.home.featuredGameId) || state.games[0];
    const featuredTag = featured?.tag ? `<span class="badge ${featured.tag === 'TNF' ? 'red' : featured.tag === 'SNF' ? 'blue' : 'green'}">${featured.tag}</span>` : `<span class="badge">Featured</span>`;
    const featuredScore = (featured?.homeScore != null && featured?.awayScore != null) ? `${featured.awayScore}-${featured.homeScore}` : 'Scheduled';
    return `
      <section class="hero">
        <div class="card">
          <div class="inner">
            <div class="kicker">NTFL Network • League Hub</div>
            <h2>${state.home.headline}</h2>
            <p class="lead">${state.home.subheadline}</p>
            <div class="stat-grid">
              ${statCard("Teams", state.teams.length, "NFL clubs in the league")}
              ${statCard("Weeks", state.weeks.length, "W1 → W18")}
              ${statCard("Games", state.games.length, "Schedule entries loaded")}
            </div>
            <div class="btn-row">
              <a class="btn primary" href="teams.html">Browse teams</a>
              <a class="btn" href="schedule.html">Open schedule</a>
              <a class="btn" href="admin.html">Open admin</a>
            </div>
          </div>
        </div>
        <div class="hero-panel">
          <div class="hero-game">
            <div class="kicker">Featured game</div>
            <div class="matchup">${featured ? `${featured.away} at ${featured.home}` : "No featured game"}</div>
            <div class="info">
              ${featuredTag}
              <span class="badge">${featured?.week || ""}</span>
              <span class="badge">${featuredScore}</span>
            </div>
            <p class="small" style="margin-top:12px">${state.home.announcement}</p>
          </div>
          <div class="card">
            <div class="inner">
              <div class="kicker">Primetime tags</div>
              <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
                ${statCard("TNF", state.games.filter(g => g.tag === "TNF").length, "Thursday prime")}
                ${statCard("SNF", state.games.filter(g => g.tag === "SNF").length, "Sunday night")}
                ${statCard("MNF", state.games.filter(g => g.tag === "MNF").length, "Monday night")}
              </div>
            </div>
          </div>
        </div>
      </section>`;
  }

  function statCard(label, value, sub) {
    return `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
  }

  function renderHome(root) {
    const { ordered } = computeStandings();
    const topTeams = ordered.slice(0, 6);
    const divisions = state.divisions.map(div => {
      const list = topTeams.filter(t => t.division === div);
      return `
        <div class="card">
          <div class="inner">
            <div class="section-head" style="margin-bottom:10px">
              <div>
                <h3>${div}</h3>
                <p>${state.teams.filter(t => t.division === div).length} teams</p>
              </div>
            </div>
            <div class="grid" style="gap:10px">
              ${list.map(t => `
                <a class="team-card card" href="team.html?team=${encodeURIComponent(t.team)}" style="padding:12px">
                  <div class="logo-wrap">${logo(t.team, 42)}</div>
                  <div>
                    <div class="name">${t.team}</div>
                    <div class="meta">${t.record} • ${t.diff >= 0 ? '+' : ''}${t.diff} PD</div>
                  </div>
                </a>
              `).join('') || `<div class="empty">No completed games yet.</div>`}
            </div>
          </div>
        </div>`;
    }).join('');

    const recent = state.games
      .filter(g => g.homeScore != null && g.awayScore != null)
      .sort((a,b) => weekNum(b.week) - weekNum(a.week))
      .slice(0, 5);

    root.innerHTML = `
      ${renderTopbar('home')}
      <main class="wrap shell">
        ${heroBlock()}
        <section class="section">
          <div class="section-head">
            <div>
              <h3>Latest results</h3>
              <p>Completed games pulled from your uploaded schedule.</p>
            </div>
            <a class="btn" href="schedule.html">View all weeks</a>
          </div>
          <div class="grid">
            ${recent.length ? recent.map(gameCard).join('') : `<div class="empty">No scored games are available yet.</div>`}
          </div>
        </section>
        <section class="section">
          <div class="section-head">
            <div>
              <h3>Division leaders</h3>
              <p>Quick view of the strongest teams by current record.</p>
            </div>
          </div>
          <div class="divisions">${divisions}</div>
        </section>
      </main>
      ${renderFooter()}
    `;
  }

  function gameCard(g) {
    const tag = g.tag ? `<span class="badge ${g.tag === 'TNF' ? 'red' : g.tag === 'SNF' ? 'blue' : 'green'}">${g.tag}</span>` : `<span class="badge">Game</span>`;
    const score = (g.homeScore != null && g.awayScore != null) ? `${g.awayScore}-${g.homeScore}` : 'Scheduled';
    const extra = g.overtime ? ' • OT' : '';
    return `
      <div class="game-row ${g.homeScore != null ? 'completed' : ''}">
        <div class="left">
          <div class="title">${g.away} at ${g.home}</div>
          <div class="sub">${g.week} • ${tag.replace(/<[^>]+>/g,'')} ${extra}</div>
        </div>
        <div class="toolbar">
          <span class="badge">${g.week}</span>
          ${tag}
          <span class="score">${score}</span>
        </div>
      </div>`;
  }

  function renderTeams(root) {
    const q = new URLSearchParams(location.search).get('q') || '';
    const filtered = state.teams.filter(t => !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.division.toLowerCase().includes(q.toLowerCase()));
    root.innerHTML = `
      ${renderTopbar('teams')}
      <main class="wrap shell">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>Teams</h2>
              <p>Click any team to open its full schedule page.</p>
            </div>
            <form class="toolbar" onsubmit="event.preventDefault(); location.href='teams.html?q=' + encodeURIComponent(this.q.value)">
              <input class="input" style="width:min(380px, 72vw)" name="q" value="${escapeHtml(q)}" placeholder="Search team or division">
              <button class="btn primary" type="submit">Search</button>
            </form>
          </div>
          <div class="team-grid">
            ${filtered.map(t => {
              const st = computeStandings().stats[t.name];
              return `
                <a class="card team-card" href="team.html?team=${encodeURIComponent(t.name)}">
                  <div class="logo-wrap">${logo(t.name, 54)}</div>
                  <div>
                    <div class="name">${t.name}</div>
                    <div class="meta">${t.division} • ${st.record}</div>
                    <div class="badges">
                      <span class="badge">${t.abbr.toUpperCase()}</span>
                      <span class="badge">${st.gamesPlayed} GP</span>
                    </div>
                  </div>
                </a>
              `;
            }).join('') || `<div class="empty">No teams match that search.</div>`}
          </div>
        </section>
      </main>
      ${renderFooter()}
    `;
  }

  function renderTeam(root) {
    const teamName = new URLSearchParams(location.search).get('team') || state.teams[0].name;
    const team = byName(teamName) || state.teams[0];
    const st = computeStandings().stats[team.name];
    const games = getTeamGames(team.name);
    const primetime = games.filter(g => g.tag).slice(0, 6);
    root.innerHTML = `
      ${renderTopbar('teams')}
      <main class="wrap shell">
        <section class="hero" style="grid-template-columns:1.05fr .95fr">
          <div class="card">
            <div class="inner">
              <div class="kicker">Team page</div>
              <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-top:10px">
                <div style="width:100px;height:100px;border-radius:28px;background:rgba(255,255,255,.06);display:grid;place-items:center;overflow:hidden;border:1px solid var(--line)">${logo(team.name, 80)}</div>
                <div>
                  <h2 style="margin:0;font-size:clamp(2rem, 4vw, 3rem)">${team.name}</h2>
                  <p class="lead" style="margin:8px 0 0">Full schedule, results, and primetime appearances.</p>
                </div>
              </div>
              <div class="stat-grid">
                ${statCard("Record", st.record || "0-0", `${st.wins} wins • ${st.losses} losses`)}
                ${statCard("Division", team.division, team.conference)}
                ${statCard("Point Diff", `${st.diff >= 0 ? '+' : ''}${st.diff}`, `${st.pf} PF • ${st.pa} PA`)}
              </div>
              <div class="badges">
                <span class="badge blue">Auto schedule</span>
                <span class="badge red">TNF</span>
                <span class="badge blue">SNF</span>
                <span class="badge gold">MNF</span>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="inner">
              <div class="kicker">Team note</div>
              <h3 style="margin-top:10px">${team.name} overview</h3>
              <p class="lead" style="font-size:.98rem">${escapeHtml(team.bio || 'Add a team bio from the admin panel.')}</p>
              <hr class="sep">
              <div class="form-grid">
                ${statCard("Games", st.gamesPlayed, "Completed only")}
                ${statCard("Streak", st.streak, "Current run")}
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <h3>Schedule</h3>
              <p>Every game for this team in order.</p>
            </div>
            <div class="toolbar">
              <span class="badge">Featured primetime: ${primetime.length}</span>
            </div>
          </div>
          <div class="schedule-list">
            ${games.map(g => {
              const badge = g.tag ? `<span class="badge ${g.tag === 'TNF' ? 'red' : g.tag === 'SNF' ? 'blue' : 'green'}">${g.tag}</span>` : `<span class="badge">Regular</span>`;
              const isHome = team.name === g.home;
              const opp = isHome ? g.away : g.home;
              const side = isHome ? 'vs' : '@';
              const score = g.homeScore != null && g.awayScore != null ? `${g.homeScore}-${g.awayScore}` : 'Scheduled';
              const result = gameResultFor(team.name, g);
              return `
                <div class="game-row ${g.homeScore != null ? 'completed' : ''}">
                  <div class="left">
                    <div class="title">${side} ${opp}</div>
                    <div class="sub">${g.week} • ${g.overtime ? 'OT • ' : ''}${g.homeScore != null ? 'Final' : 'Scheduled'}</div>
                  </div>
                  <div class="toolbar">
                    ${badge}
                    <span class="${result.cls}">${result.text}</span>
                    <span class="score">${score}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <div>
              <h3>Primetime games</h3>
              <p>TNF / SNF / MNF highlights for this team.</p>
            </div>
          </div>
          <div class="schedule-list">
            ${primetime.length ? primetime.map(gameCard).join('') : `<div class="empty">No primetime games set for this team yet.</div>`}
          </div>
        </section>
      </main>
      ${renderFooter()}
    `;
  }

  function renderSchedule(root) {
    const selected = new URLSearchParams(location.search).get('week') || state.weeks[0];
    const games = state.games.filter(g => g.week === selected).sort((a,b) => a.home.localeCompare(b.home));
    root.innerHTML = `
      ${renderTopbar('schedule')}
      <main class="wrap shell">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>Schedule</h2>
              <p>Switch weeks and check primetime tags, scores, and results.</p>
            </div>
            <div class="toolbar">
              <span class="badge">18 weeks</span>
              <span class="badge">Editable from admin</span>
            </div>
          </div>
          <div class="pills">
            ${state.weeks.map(w => `<a class="pill ${w===selected ? 'active' : ''}" href="schedule.html?week=${w}">${w}</a>`).join('')}
          </div>
        </section>
        <section class="section">
          <div class="card"><div class="inner">
            <div class="section-head" style="margin-bottom:10px">
              <div>
                <h3>${selected}</h3>
                <p>${games.length} games on the board.</p>
              </div>
            </div>
            <div class="schedule-list">
              ${games.length ? games.map(g => {
                const tag = g.tag ? `<span class="badge ${g.tag === 'TNF' ? 'red' : g.tag === 'SNF' ? 'blue' : 'green'}">${g.tag}</span>` : `<span class="badge">Regular</span>`;
                return `
                  <div class="game-row ${g.homeScore != null ? 'completed' : ''}">
                    <div class="left">
                      <div class="title">${g.away} at ${g.home}</div>
                      <div class="sub">${g.week}${g.overtime ? ' • OT' : ''}${g.homeScore != null ? ' • Final' : ''}</div>
                    </div>
                    <div class="toolbar">
                      ${tag}
                      <span class="badge">${g.homeScore != null ? `${g.awayScore}-${g.homeScore}` : 'Scheduled'}</span>
                      <a class="btn" href="team.html?team=${encodeURIComponent(g.home)}">Home team</a>
                      <a class="btn" href="team.html?team=${encodeURIComponent(g.away)}">Away team</a>
                    </div>
                  </div>
                `;
              }).join('') : `<div class="empty">No games found for that week.</div>`}
            </div>
          </div></div>
        </section>
      </main>
      ${renderFooter()}
    `;
  }

  function renderStandings(root) {
    const { ordered } = computeStandings();
    root.innerHTML = `
      ${renderTopbar('standings')}
      <main class="wrap shell">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>Standings</h2>
              <p>Auto-calculated from completed scores in your schedule.</p>
            </div>
            <div class="toolbar">
              <span class="badge green">Win %</span>
              <span class="badge">Division view</span>
            </div>
          </div>
        </section>
        <section class="section">
          <div class="card"><div class="inner">
            <div class="section-head" style="margin-bottom:10px">
              <div>
                <h3>League table</h3>
                <p>Ranked by win percentage, wins, and point differential.</p>
              </div>
            </div>
            <div style="overflow:auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th><th>Team</th><th>Division</th><th>Record</th><th>PF</th><th>PA</th><th>Diff</th><th>Streak</th>
                  </tr>
                </thead>
                <tbody>
                  ${ordered.map((t, i) => `
                    <tr>
                      <td>${i+1}</td>
                      <td><a href="team.html?team=${encodeURIComponent(t.team)}"><strong>${t.team}</strong></a></td>
                      <td>${t.division}</td>
                      <td>${t.record}</td>
                      <td>${t.pf}</td>
                      <td>${t.pa}</td>
                      <td class="${t.diff >= 0 ? 'row-win' : 'row-loss'}">${t.diff >= 0 ? '+' : ''}${t.diff}</td>
                      <td>${t.streak}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div></div>
        </section>
      </main>
      ${renderFooter()}
    `;
  }

  function renderHOF(root) {
    root.innerHTML = `
      ${renderTopbar('hof')}
      <main class="wrap shell">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>Hall of Fame</h2>
              <p>Add award winners, legends, and milestone entries from the admin dashboard.</p>
            </div>
          </div>
          <div class="card"><div class="inner">
            <div class="schedule-list">
              ${state.hof.length ? state.hof.map(item => `
                <div class="game-row">
                  <div class="left">
                    <div class="title">${escapeHtml(item.name || '')}</div>
                    <div class="sub">${escapeHtml([item.team, item.year].filter(Boolean).join(' • '))}</div>
                  </div>
                  <span class="badge gold">${escapeHtml(item.achievement || '')}</span>
                </div>
              `).join('') : `<div class="empty">No Hall of Fame entries yet. Use Admin to add the first one.</div>`}
            </div>
          </div></div>
        </section>
      </main>
      ${renderFooter()}
    `;
  }

  function renderHistory(root) {
    root.innerHTML = `
      ${renderTopbar('history')}
      <main class="wrap shell">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>History</h2>
              <p>Season-by-season champions and records.</p>
            </div>
          </div>
          <div class="card"><div class="inner">
            <div class="schedule-list">
              ${state.history.length ? state.history.map(item => `
                <div class="game-row">
                  <div class="left">
                    <div class="title">${escapeHtml(item.season || '')}</div>
                    <div class="sub">${escapeHtml(item.record || '')}</div>
                  </div>
                  <span class="badge blue">${escapeHtml(item.champion || '')}</span>
                </div>
              `).join('') : `<div class="empty">No history entries yet. Add seasons from Admin.</div>`}
            </div>
          </div></div>
        </section>
      </main>
      ${renderFooter()}
    `;
  }

  function renderAdmin(root) {
    const { ordered } = computeStandings();
    const week = new URLSearchParams(location.search).get('week') || state.weeks[0];
    const weekGames = state.games.filter(g => g.week === week).sort((a,b) => a.home.localeCompare(b.home));
    root.innerHTML = `
      ${renderTopbar('admin')}
      <main class="wrap shell">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>Admin Dashboard</h2>
              <p>Single-admin editing for homepage content, schedule scores, primetime tags, HOF, and history.</p>
            </div>
            <div class="toolbar">
              <button class="btn" id="btnExport">Export JSON</button>
              <label class="btn" for="importFile" style="cursor:pointer">Import JSON</label>
              <input id="importFile" type="file" accept="application/json" style="display:none">
              <button class="btn" id="btnReset">Reset</button>
            </div>
          </div>
          <div class="notice">Edits are stored in your browser on this device. Use Export JSON to save a backup or move the data into GitHub later.</div>
        </section>

        <section class="section card"><div class="inner">
          <div class="section-head">
            <div>
              <h3>Homepage</h3>
              <p>Edit the public home page text and featured game.</p>
            </div>
          </div>
          <div class="form-grid">
            <div class="field"><label>Headline</label><input class="input" id="homeHeadline" value="${escapeAttr(state.home.headline)}"></div>
            <div class="field"><label>Featured game</label>
              <select id="featuredGameId" class="input">
                ${state.games.map(g => `<option value="${g.id}" ${g.id===state.home.featuredGameId?'selected':''}>${escapeAttr(`${g.week} • ${g.away} at ${g.home}`)}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="grid-column:1/-1"><label>Subheadline</label><textarea id="homeSubheadline" class="input">${escapeHtml(state.home.subheadline)}</textarea></div>
            <div class="field" style="grid-column:1/-1"><label>Announcement</label><textarea id="homeAnnouncement" class="input">${escapeHtml(state.home.announcement)}</textarea></div>
          </div>
        </div></section>

        <section class="section card"><div class="inner">
          <div class="section-head">
            <div>
              <h3>Schedule editor</h3>
              <p>Pick a week and update scores, status, tag, or overtime.</p>
            </div>
            <div class="toolbar">
              <select id="weekSelect" class="input" style="width:140px">
                ${state.weeks.map(w => `<option value="${w}" ${w===week?'selected':''}>${w}</option>`).join('')}
              </select>
              <button class="btn primary" id="saveWeek">Save week</button>
            </div>
          </div>
          <div class="schedule-list" id="weekEditor">
            ${weekGames.map(g => editorRow(g)).join('')}
          </div>
        </div></section>

        <section class="section card"><div class="inner">
          <div class="section-head">
            <div>
              <h3>Team bios</h3>
              <p>Short notes that appear on team pages.</p>
            </div>
          </div>
          <div class="editor-section">
            ${state.teams.map(t => `
              <div class="editor-card">
                <div class="form-grid">
                  <div class="field"><label>${escapeHtml(t.name)} coach</label><input class="input team-coach" data-team="${escapeAttr(t.name)}" value="${escapeAttr(t.coach || '')}"></div>
                  <div class="field"><label>${escapeHtml(t.name)} bio</label><input class="input team-bio" data-team="${escapeAttr(t.name)}" value="${escapeAttr(t.bio || '')}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div></section>

        <section class="section grid" style="grid-template-columns:1fr 1fr;gap:18px">
          <div class="card"><div class="inner">
            <div class="section-head"><div><h3>Hall of Fame</h3><p>Add or remove entries.</p></div></div>
            <div id="hofEditor" class="editor-section">
              ${state.hof.map((h, idx) => hofRow(h, idx)).join('')}
            </div>
            <button class="btn" id="addHof">Add HOF entry</button>
          </div></div>
          <div class="card"><div class="inner">
            <div class="section-head"><div><h3>History</h3><p>Add season champions.</p></div></div>
            <div id="historyEditor" class="editor-section">
              ${state.history.map((h, idx) => historyRow(h, idx)).join('')}
            </div>
            <button class="btn" id="addHistory">Add history entry</button>
          </div></div>
        </section>
      </main>
      ${renderFooter()}
    `;

    document.getElementById("weekSelect").addEventListener("change", (e) => {
      location.href = `admin.html?week=${encodeURIComponent(e.target.value)}`;
    });
    document.getElementById("btnReset").addEventListener("click", () => {
      if (confirm("Reset the local admin edits on this device?")) resetState();
    });
    document.getElementById("btnExport").addEventListener("click", exportJSON);
    document.getElementById("importFile").addEventListener("change", importJSON);
    document.getElementById("saveWeek").addEventListener("click", () => {
      const current = getState();
      current.home.headline = document.getElementById("homeHeadline").value.trim();
      current.home.subheadline = document.getElementById("homeSubheadline").value.trim();
      current.home.announcement = document.getElementById("homeAnnouncement").value.trim();
      current.home.featuredGameId = document.getElementById("featuredGameId").value;

      document.querySelectorAll(".team-coach").forEach(el => {
        const team = current.teams.find(t => t.name === el.dataset.team);
        if (team) team.coach = el.value.trim();
      });
      document.querySelectorAll(".team-bio").forEach(el => {
        const team = current.teams.find(t => t.name === el.dataset.team);
        if (team) team.bio = el.value.trim();
      });

      const week = document.getElementById("weekSelect").value;
      current.games = current.games.map(g => {
        const match = document.querySelector(`[data-game-id="${g.id}"]`);
        if (!match) return g;
        const updated = { ...g };
        updated.homeScore = parseNum(match.querySelector('.home-score').value);
        updated.awayScore = parseNum(match.querySelector('.away-score').value);
        updated.tag = match.querySelector('.tag').value;
        updated.status = match.querySelector('.status').value;
        updated.overtime = match.querySelector('.ot').checked;
        if (updated.homeScore != null && updated.awayScore != null) {
          updated.status = 'completed';
        }
        return updated;
      });

      const hofItems = [];
      document.querySelectorAll('.hof-item').forEach(node => {
        const item = {
          name: node.querySelector('.hof-name').value.trim(),
          team: node.querySelector('.hof-team').value.trim(),
          year: node.querySelector('.hof-year').value.trim(),
          achievement: node.querySelector('.hof-achievement').value.trim(),
        };
        if (item.name || item.team || item.year || item.achievement) hofItems.push(item);
      });
      current.hof = hofItems;

      const histItems = [];
      document.querySelectorAll('.history-item').forEach(node => {
        const item = {
          season: node.querySelector('.history-season').value.trim(),
          champion: node.querySelector('.history-champion').value.trim(),
          record: node.querySelector('.history-record').value.trim(),
        };
        if (item.season || item.champion || item.record) histItems.push(item);
      });
      current.history = histItems;

      saveState(current);
      alert("Saved to this browser. Use Export JSON to back it up or move it into GitHub.");
      location.reload();
    });

    document.getElementById("addHof").addEventListener("click", () => {
      const current = getState();
      current.hof.push({ name:"", team:"", year:"", achievement:"" });
      saveState(current);
      location.reload();
    });
    document.getElementById("addHistory").addEventListener("click", () => {
      const current = getState();
      current.history.push({ season:"", champion:"", record:"" });
      saveState(current);
      location.reload();
    });
  }

  function editorRow(g) {
    return `
      <div class="editor-card" data-game-id="${g.id}">
        <div class="section-head" style="margin-bottom:12px">
          <div>
            <div style="font-weight:800">${g.away} at ${g.home}</div>
            <div class="small">${g.week} • ${g.id}</div>
          </div>
          <span class="badge ${g.tag === 'TNF' ? 'red' : g.tag === 'SNF' ? 'blue' : g.tag === 'MNF' ? 'green' : ''}">${g.tag || 'REG'}</span>
        </div>
        <div class="form-grid">
          <div class="field"><label>Away score</label><input class="input away-score" value="${g.awayScore ?? ''}" inputmode="numeric"></div>
          <div class="field"><label>Home score</label><input class="input home-score" value="${g.homeScore ?? ''}" inputmode="numeric"></div>
          <div class="field"><label>Primetime tag</label>
            <select class="input tag">
              ${['','TNF','SNF','MNF'].map(t => `<option value="${t}" ${g.tag===t ? 'selected' : ''}>${t || 'None'}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Status</label>
            <select class="input status">
              ${['scheduled','completed','postponed'].map(s => `<option value="${s}" ${g.status===s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Overtime</label><label class="btn" style="justify-content:flex-start"><input type="checkbox" class="ot" ${g.overtime ? 'checked' : ''}> Mark OT</label></div>
        </div>
      </div>
    `;
  }

  function hofRow(h, idx) {
    return `
      <div class="editor-card hof-item">
        <div class="form-grid">
          <div class="field"><label>Name</label><input class="input hof-name" value="${escapeAttr(h.name || '')}"></div>
          <div class="field"><label>Team</label><input class="input hof-team" value="${escapeAttr(h.team || '')}"></div>
          <div class="field"><label>Year</label><input class="input hof-year" value="${escapeAttr(h.year || '')}"></div>
          <div class="field"><label>Achievement</label><input class="input hof-achievement" value="${escapeAttr(h.achievement || '')}"></div>
        </div>
      </div>
    `;
  }

  function historyRow(h, idx) {
    return `
      <div class="editor-card history-item">
        <div class="form-grid">
          <div class="field"><label>Season</label><input class="input history-season" value="${escapeAttr(h.season || '')}"></div>
          <div class="field"><label>Champion</label><input class="input history-champion" value="${escapeAttr(h.champion || '')}"></div>
          <div class="field"><label>Record</label><input class="input history-record" value="${escapeAttr(h.record || '')}"></div>
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'" :'&#39;','"':'&quot;'}[c]));
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/`/g, '&#96;'); }
  function parseNum(v) {
    const s = String(v ?? "").trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ntfl-state.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      saveState(mergeState(DEFAULT, parsed));
      alert("Imported successfully.");
      location.reload();
    } catch (err) {
      alert("That file wasn't valid JSON.");
    }
  }

  // add page root if missing? use #app
  const root = document.getElementById("app");
  if (!root) return;
  const page = document.body.dataset.page || 'home';
  if (page === 'home') renderHome(root);
  else if (page === 'teams') renderTeams(root);
  else if (page === 'team') renderTeam(root);
  else if (page === 'schedule') renderSchedule(root);
  else if (page === 'standings') renderStandings(root);
  else if (page === 'hof') renderHOF(root);
  else if (page === 'history') renderHistory(root);
  else if (page === 'admin') renderAdmin(root);
})();
