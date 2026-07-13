(function () {
  const STORAGE_KEY = "ntfl-site-state-v1";
  const DEFAULTS = window.NTFL_DEFAULT_STATE;

  const NFL_LOGO_CODES = {
    Bills: "buf",
    Dolphins: "mia",
    Patriots: "ne",
    Jets: "nyj",
    Ravens: "bal",
    Bengals: "cin",
    Browns: "cle",
    Steelers: "pit",
    Texans: "hou",
    Colts: "ind",
    Jaguars: "jax",
    Titans: "ten",
    Chiefs: "kc",
    Chargers: "lac",
    Broncos: "den",
    Raiders: "lv",
    Cowboys: "dal",
    Eagles: "phi",
    Giants: "nyg",
    Commanders: "wsh",
    Lions: "det",
    Packers: "gb",
    Vikings: "min",
    Bears: "chi",
    Buccaneers: "tb",
    Falcons: "atl",
    Saints: "no",
    Panthers: "car",
    "49ers": "sf",
    Seahawks: "sea",
    Rams: "lar",
    Cardinals: "ari",
  };

  const page = document.body.dataset.page || "home";
  const app = document.getElementById("app");

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return clone(DEFAULTS);
      return {
        ...clone(DEFAULTS),
        ...saved,
        site: { ...clone(DEFAULTS.site), ...(saved.site || {}) },
        teams: saved.teams || clone(DEFAULTS.teams),
        games: saved.games || clone(DEFAULTS.games),
        hof: saved.hof || [],
        history: saved.history || [],
        rankingsOrder: saved.rankingsOrder || clone(DEFAULTS.rankingsOrder),
        rankingsNotes: saved.rankingsNotes || {},
      };
    } catch (e) {
      return clone(DEFAULTS);
    }
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetState() {
    state = clone(DEFAULTS);
    saveState();
    render();
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function logoUrl(team) {
    const code = NFL_LOGO_CODES[team];
    return code ? `https://a.espncdn.com/i/teamlogos/nfl/500/${code}.png` : "";
  }

  function pct(record) {
    const gp = record.gp || (record.w + record.l + record.t);
    return gp ? (record.w + record.t * 0.5) / gp : 0;
  }

  function computeStandings() {
    const rec = {};
    for (const team of state.teams) {
      rec[team.name] = {
        team: team.name,
        division: team.division,
        w: 0, l: 0, t: 0, pf: 0, pa: 0, diff: 0, gp: 0,
      };
    }
    for (const g of state.games) {
      if (g.home_score === "" || g.away_score === "" || g.home_score == null || g.away_score == null) continue;
      const hs = Number(g.home_score);
      const as = Number(g.away_score);
      if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
      const h = rec[g.home], a = rec[g.away];
      if (!h || !a) continue;
      h.pf += hs; h.pa += as; h.gp += 1;
      a.pf += as; a.pa += hs; a.gp += 1;
      if (hs > as) { h.w += 1; a.l += 1; }
      else if (as > hs) { a.w += 1; h.l += 1; }
      else { h.t += 1; a.t += 1; }
    }
    for (const r of Object.values(rec)) r.diff = r.pf - r.pa;
    const overall = Object.values(rec).sort((a, b) => pct(b) - pct(a) || b.diff - a.diff || b.pf - a.pf || a.pa - b.pa || a.team.localeCompare(b.team));
    const byDivision = {};
    for (const div of [...new Set(state.teams.map(t => t.division))]) {
      byDivision[div] = overall.filter(t => t.division === div);
    }
    return { overall, byDivision, records: rec };
  }

  function getTeam(teamName) {
    return state.teams.find(t => t.name === teamName);
  }

  function teamGames(teamName) {
    return state.games
      .filter(g => g.home === teamName || g.away === teamName)
      .sort((a, b) => Number(a.week.slice(1)) - Number(b.week.slice(1)) || a.home.localeCompare(b.home));
  }

  function latestResult() {
    const played = state.games.filter(g => g.home_score !== "" && g.home_score != null && g.away_score !== "" && g.away_score != null);
    if (!played.length) return null;
    return played.sort((a, b) => Number(b.week.slice(1)) - Number(a.week.slice(1)))[0];
  }

  function featuredGame() {
    const played = state.games.filter(g => g.home_score !== "" && g.home_score != null && g.away_score !== "" && g.away_score != null);
    if (played.length) return played.sort((a, b) => Number(b.week.slice(1)) - Number(a.week.slice(1)))[0];
    return state.games[0] || null;
  }

  function activeClass(target) {
    return page === target ? "active" : "";
  }

  function renderHeader() {
    const logo = escapeHtml(state.site.logoFile || "IMG_5900.png");
    return `
      <header class="topbar">
        <div class="wrap topbar-inner">
          <a href="index.html" class="brand" aria-label="Home">
            <img src="${logo}" class="logo" alt="League logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="logo-fallback" style="display:none;">NT</div>
            <div class="txt">
              <h1>${escapeHtml(state.site.name)}</h1>
              <p>${escapeHtml(state.site.tagline)}</p>
            </div>
          </a>
          <nav class="nav">
            <a class="${activeClass('home')}" href="index.html">Home</a>
            <a class="${activeClass('teams')}" href="teams.html">Teams</a>
            <a class="${activeClass('schedule')}" href="schedule.html">Schedule</a>
            <a class="${activeClass('standings')}" href="standings.html">Standings</a>
            <a class="${activeClass('rankings')}" href="rankings.html">Rankings</a>
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
        <div>NTFL Network is a fan-built league hub. Edits are saved locally on this device through the admin page, with export/import built in.</div>
      </footer>`;
  }

  function statCard(label, value, sub) {
    return `
      <div class="card stat">
        <div class="label">${escapeHtml(label)}</div>
        <div class="value">${escapeHtml(value)}</div>
        <div class="sub">${escapeHtml(sub || "")}</div>
      </div>`;
  }

  function teamLogo(team) {
    return `<img src="${logoUrl(team)}" alt="${escapeHtml(team)} logo" onerror="this.style.display='none'">`;
  }

  function formatScore(g) {
    if (g.home_score == null || g.away_score == null || g.home_score === "" || g.away_score === "") return "TBD";
    return `${g.away_score}-${g.home_score}`;
  }

  function gameResult(game, teamName) {
    if (game.home_score == null || game.away_score == null || game.home_score === "" || game.away_score === "") return { text: "TBD", cls: "tie" };
    const hs = Number(game.home_score);
    const as = Number(game.away_score);
    if (!Number.isFinite(hs) || !Number.isFinite(as) || hs === as) return { text: "TIE", cls: "tie" };
    const isHome = game.home === teamName;
    const win = (isHome && hs > as) || (!isHome && as > hs);
    return { text: win ? "W" : "L", cls: win ? "win" : "loss" };
  }

  function resultForGame(game) {
    if (game.home_score == null || game.away_score == null || game.home_score === "" || game.away_score === "") return { text: "TBD", cls: "tie" };
    const hs = Number(game.home_score), as = Number(game.away_score);
    if (!Number.isFinite(hs) || !Number.isFinite(as) || hs === as) return { text: "TIE", cls: "tie" };
    return { text: hs > as ? `${game.home} W` : `${game.away} W`, cls: hs > as ? "good" : "bad" };
  }

  function renderHome() {
    const { overall } = computeStandings();
    const top = overall[0];
    const latest = latestResult();
    const featured = featuredGame();
    const champCount = state.history.length;
    const gameCount = state.games.length;
    const scoredCount = state.games.filter(g => g.home_score != null && g.away_score != null && g.home_score !== "" && g.away_score !== "").length;

    return `
      <main class="wrap">
        <section class="hero">
          <div class="inline" style="justify-content:space-between">
            <div style="max-width:760px">
              <div class="badge gold">NTFL hub • ${gameCount} games loaded</div>
              <h2 style="margin-top:14px">Your league, your pages, your control.</h2>
              <p>Click a team to see its full schedule, check standings, and edit rankings from the admin panel whenever you need to.</p>
              <div class="hero-actions">
                <a class="btn" href="teams.html">Browse teams</a>
                <a class="btn-secondary" href="admin.html">Open admin</a>
              </div>
            </div>
            <div style="min-width:240px;max-width:320px" class="card panel">
              <div class="small">Current leader</div>
              <div style="font-size:1.5rem;font-weight:900;margin-top:6px">${escapeHtml(top.team)}</div>
              <div class="small">${top.w}-${top.l}${top.t ? `-${top.t}` : ""} • ${top.division}</div>
              <hr class="sep">
              <div class="small">Games with scores</div>
              <div style="font-size:1.5rem;font-weight:900;margin-top:6px">${scoredCount}</div>
              <div class="small">${champCount ? `${champCount} history entries` : "History ready to build"}</div>
            </div>
          </div>
        </section>

        <section class="section grid grid-3">
          ${statCard("Top team", top.team, `${top.w}-${top.l}${top.t ? `-${top.t}` : ""} • ${top.diff >= 0 ? "+" : ""}${top.diff} point diff`)}
          ${statCard("Featured matchup", featured ? `${featured.away} @ ${featured.home}` : "None yet", featured ? (featured.tag ? featured.tag : (featured.home_score != null ? formatScore(featured) : "Upcoming")) : "No games found")}
          ${statCard("Latest result", latest ? `${latest.away} @ ${latest.home}` : "None yet", latest ? formatScore(latest) : "Add a score in admin")}
        </section>

        <section class="section grid grid-2">
          <div class="card">
            <div class="pad">
              <div class="section-head">
                <div>
                  <h3>Top of standings</h3>
                  <p>The current order is calculated from the schedule scores in the workbook.</p>
                </div>
                <a class="btn-secondary" href="standings.html">Full standings</a>
              </div>
              <div class="mini-list">
                ${overall.slice(0, 5).map(t => `
                  <div class="mini-item">
                    <div class="inline" style="gap:10px">
                      ${teamLogo(t.team)}
                      <div>
                        <div style="font-weight:800">${escapeHtml(t.team)}</div>
                        <div class="small">${t.division}</div>
                      </div>
                    </div>
                    <div style="text-align:right">
                      <div style="font-weight:800">${t.w}-${t.l}${t.t ? `-${t.t}` : ""}</div>
                      <div class="small">${t.pf} PF • ${t.diff >= 0 ? "+" : ""}${t.diff}</div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="pad">
              <div class="section-head">
                <div>
                  <h3>League notes</h3>
                  <p>Quick access to what you can control.</p>
                </div>
              </div>
              <div class="grid" style="gap:10px">
                <div class="badge">Editable rankings page</div>
                <div class="badge">Team pages with full schedules</div>
                <div class="badge">Primetime tags: TNF / SNF / MNF</div>
                <div class="badge">Hall of Fame and history pages</div>
                <div class="badge">Single-admin dashboard</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  function renderTeams() {
    const divs = [...new Set(state.teams.map(t => t.division))];
    const { records } = computeStandings();
    return `
      <main class="wrap">
        <section class="section">
          <div class="section-head">
            <div>
              <h2>Teams</h2>
              <p>Click any team to open its full page and schedule.</p>
            </div>
            <a class="btn-secondary" href="standings.html">Standings</a>
          </div>

          ${divs.map(div => `
            <div class="card" style="margin-bottom:14px">
              <div class="pad">
                <div class="division-title">
                  <h3 style="margin:0">${escapeHtml(div)}</h3>
                  <div class="small">${state.teams.filter(t => t.division === div).length} teams</div>
                </div>
                <div class="team-grid">
                  ${state.teams.filter(t => t.division === div).map(t => {
                    const r = records[t.name];
                    return `
                      <a class="team-card" href="team.html?team=${encodeURIComponent(t.name)}">
                        <div class="row">
                          ${teamLogo(t.name)}
                          <div>
                            <div class="name">${escapeHtml(t.name)}</div>
                            <div class="meta">${r.w}-${r.l}${r.t ? `-${r.t}` : ""} • ${r.diff >= 0 ? "+" : ""}${r.diff} diff</div>
                          </div>
                        </div>
                        <div class="meta">Open team page</div>
                      </a>`;
                  }).join("")}
                </div>
              </div>
            </div>
          `).join("")}
        </section>
      </main>
    `;
  }

  function renderTeamPage() {
    const params = new URLSearchParams(window.location.search);
    const teamName = params.get("team") || state.teams[0]?.name;
    const team = getTeam(teamName) || state.teams[0];
    const { records } = computeStandings();
    const rec = records[team.name];
    const games = teamGames(team.name);

    return `
      <main class="wrap">
        <section class="section card">
          <div class="pad">
            <div class="team-header">
              ${teamLogo(team.name)}
              <div>
                <h2>${escapeHtml(team.name)}</h2>
                <div class="small">${escapeHtml(team.division)} • ${rec.w}-${rec.l}${rec.t ? `-${rec.t}` : ""} • ${rec.gp} games</div>
              </div>
              <div style="margin-left:auto" class="inline">
                <span class="badge">${rec.pf} PF</span>
                <span class="badge">${rec.pa} PA</span>
                <span class="badge gold">${rec.diff >= 0 ? "+" : ""}${rec.diff} DIFF</span>
              </div>
            </div>
            <hr class="sep">
            <div class="section-head">
              <div>
                <h3>Full schedule</h3>
                <p>All games for this team, sorted by week.</p>
              </div>
              <a class="btn-secondary" href="teams.html">Back to teams</a>
            </div>
            <div class="mini-list">
              ${games.map(g => {
                const result = gameResult(g, team.name);
                const score = (g.home_score != null && g.away_score != null && g.home_score !== "" && g.away_score !== "") ? formatScore(g) : "TBD";
                const tag = g.tag ? `<span class="badge">${escapeHtml(g.tag)}</span>` : "";
                const note = g.note ? `<span class="badge">${escapeHtml(g.note)}</span>` : "";
                const opp = g.home === team.name ? `vs ${g.away}` : `@ ${g.home}`;
                return `
                  <div class="game-card">
                    <div class="game-left">
                      <div class="game-main">${escapeHtml(g.week)} • ${escapeHtml(opp)}</div>
                      <div class="game-sub">${g.home === team.name ? 'Home' : 'Away'} • ${score}</div>
                    </div>
                    <div class="inline">${tag}${note}<span class="result ${result.cls}">${result.text}</span></div>
                  </div>`;
              }).join("")}
            </div>
          </div>
        </section>
      </main>
    `;
  }

  function renderSchedule() {
    const weeks = [...new Set(state.games.map(g => g.week))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("week") || weeks[0];
    return `
      <main class="wrap">
        <section class="section card">
          <div class="pad">
            <div class="schedule-hero">
              <div>
                <h2>Schedule</h2>
                <p>Week-by-week games with tags for TNF, SNF, and MNF.</p>
              </div>
              <a class="btn-secondary" href="admin.html">Edit scores / tags</a>
            </div>
            <div class="tabs" id="weekTabs" style="margin-top:14px">
              ${weeks.map(w => `<button class="tab ${w===initial?'active':''}" data-week="${w}">${w}</button>`).join("")}
            </div>
            <div id="scheduleList" style="margin-top:16px"></div>
          </div>
        </section>
      </main>
    `;
  }

  function renderStandings() {
    const { overall, byDivision } = computeStandings();
    return `
      <main class="wrap">
        <section class="section card">
          <div class="pad">
            <div class="section-head">
              <div>
                <h2>Standings</h2>
                <p>Automatically calculated from the scored games in the schedule.</p>
              </div>
              <a class="btn-secondary" href="rankings.html">Power rankings</a>
            </div>
            <div class="grid" style="gap:18px">
              ${Object.keys(byDivision).map(div => `
                <div>
                  <div class="division-title">
                    <h3 style="margin:0">${escapeHtml(div)}</h3>
                    <div class="small">Sorted by record and point differential</div>
                  </div>
                  <div class="card" style="overflow:hidden">
                    <table class="table">
                      <thead>
                        <tr>
                          <th>#</th><th>Team</th><th>Record</th><th>PF</th><th>PA</th><th>Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${byDivision[div].map((t, idx) => `
                          <tr>
                            <td>${idx + 1}</td>
                            <td>
                              <div class="inline" style="gap:10px">
                                ${teamLogo(t.team)}
                                <div>
                                  <div style="font-weight:800">${escapeHtml(t.team)}</div>
                                  <div class="small">${t.gp} games</div>
                                </div>
                              </div>
                            </td>
                            <td>${t.w}-${t.l}${t.t ? `-${t.t}` : ""}</td>
                            <td>${t.pf}</td>
                            <td>${t.pa}</td>
                            <td>${t.diff >= 0 ? "+" : ""}${t.diff}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                </div>
              `).join("")}
            </div>

            <hr class="sep">

            <div class="division-title">
              <h3 style="margin:0">Overall</h3>
              <div class="small">All teams combined</div>
            </div>
            <div class="card" style="overflow:hidden">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th><th>Team</th><th>Division</th><th>Record</th><th>PF</th><th>PA</th><th>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  ${overall.map((t, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${escapeHtml(t.team)}</td>
                      <td>${escapeHtml(t.division)}</td>
                      <td>${t.w}-${t.l}${t.t ? `-${t.t}` : ""}</td>
                      <td>${t.pf}</td>
                      <td>${t.pa}</td>
                      <td>${t.diff >= 0 ? "+" : ""}${t.diff}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  function rankingsList() {
    const { overall } = computeStandings();
    const order = state.rankingsOrder?.length ? state.rankingsOrder : overall.map(t => t.team);
    const map = new Map(overall.map(t => [t.team, t]));
    return order.map((name, idx) => map.get(name)).filter(Boolean).map((t, idx) => ({
      ...t,
      rank: idx + 1,
      note: state.rankingsNotes?.[t.team] || ""
    }));
  }

  function renderRankings() {
    const rows = rankingsList();
    return `
      <main class="wrap">
        <section class="section card">
          <div class="pad">
            <div class="section-head">
              <div>
                <h2>Rankings</h2>
                <p>Editable power rankings. Change the order in Admin.</p>
              </div>
              <a class="btn-secondary" href="admin.html">Edit rankings</a>
            </div>
            <div class="card" style="padding:16px">
              <div class="rank-row head">
                <div>#</div><div>Team</div><div>Record</div><div>PF</div><div>Diff</div>
              </div>
              ${rows.map(r => `
                <div class="rank-row" style="padding:10px 0;border-top:1px solid var(--line)">
                  <div class="num">${r.rank}</div>
                  <div class="team">
                    ${teamLogo(r.team)}
                    <div>
                      <div style="font-weight:800">${escapeHtml(r.team)}</div>
                      <div class="small">${escapeHtml(r.division)}${r.note ? ` • ${escapeHtml(r.note)}` : ""}</div>
                    </div>
                  </div>
                  <div>${r.w}-${r.l}${r.t ? `-${r.t}` : ""}</div>
                  <div>${r.pf}</div>
                  <div>${r.diff >= 0 ? "+" : ""}${r.diff}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </section>
      </main>
    `;
  }

  function renderListPage(title, items, emptyText) {
    return `
      <main class="wrap">
        <section class="section card">
          <div class="pad">
            <div class="section-head">
              <div>
                <h2>${escapeHtml(title)}</h2>
                <p>${emptyText}</p>
              </div>
            </div>
            ${items.length ? `
              <div class="mini-list">
                ${items.map(item => `
                  <div class="mini-item">
                    <div>
                      <div style="font-weight:800">${escapeHtml(item.title || item.name || "")}</div>
                      <div class="small">${escapeHtml(item.subtitle || item.team || item.season || "")}</div>
                    </div>
                    <div class="small">${escapeHtml(item.right || item.year || "")}</div>
                  </div>
                `).join("")}
              </div>
            ` : `<div class="note">${escapeHtml(emptyText)}</div>`}
          </div>
        </section>
      </main>
    `;
  }

  function renderHof() {
    return renderListPage("Hall of Fame", state.hof.map(x => ({ title: x.name, subtitle: `${x.team} • ${x.achievement}`, right: x.year })), "No Hall of Fame entries yet. Add them in Admin.");
  }

  function renderHistory() {
    return renderListPage("History", state.history.map(x => ({ title: x.season, subtitle: `${x.champion} • ${x.record || ""}`, right: "" })), "No history entries yet. Add them in Admin.");
  }

  function renderAdmin() {
    const rankingsText = (state.rankingsOrder || []).join("\n");
    const games = [...state.games].sort((a, b) => Number(a.week.slice(1)) - Number(b.week.slice(1)) || a.home.localeCompare(b.home));
    return `
      <main class="wrap">
        <section class="section card">
          <div class="pad">
            <div class="section-head">
              <div>
                <h2>Admin</h2>
                <p>Edit the homepage text, logo filename, and rankings order. Changes save to this browser on this device.</p>
              </div>
              <div class="inline">
                <button class="btn-secondary" id="exportBtn" type="button">Export JSON</button>
                <label class="btn-secondary" style="cursor:pointer">
                  Import JSON
                  <input type="file" id="importFile" accept="application/json" hidden>
                </label>
                <button class="btn-secondary" id="resetBtn" type="button">Reset</button>
              </div>
            </div>

            <div class="grid grid-2">
              <div class="card">
                <div class="pad">
                  <h3 style="margin-top:0">Site settings</h3>
                  <div class="grid" style="gap:10px">
                    <label>
                      <div class="small">Site name</div>
                      <input id="siteName" type="text" value="${escapeHtml(state.site.name)}">
                    </label>
                    <label>
                      <div class="small">Tagline</div>
                      <input id="siteTagline" type="text" value="${escapeHtml(state.site.tagline)}">
                    </label>
                    <label>
                      <div class="small">Logo filename</div>
                      <input id="siteLogo" type="text" value="${escapeHtml(state.site.logoFile)}">
                    </label>
                    <button class="btn" id="saveSiteBtn" type="button">Save site settings</button>
                  </div>
                </div>
              </div>

              <div class="card">
                <div class="pad">
                  <h3 style="margin-top:0">Rankings order</h3>
                  <div class="small">One team per line. The rankings page will use this order.</div>
                  <textarea id="rankingsText">${escapeHtml(rankingsText)}</textarea>
                  <div class="inline" style="margin-top:10px">
                    <button class="btn" id="saveRankingsBtn" type="button">Save rankings</button>
                    <button class="btn-secondary" id="fillStandingsBtn" type="button">Use current standings</button>
                  </div>
                </div>
              </div>
            </div>

            <hr class="sep">

            <div class="grid grid-2">
              <div class="card">
                <div class="pad">
                  <h3 style="margin-top:0">Hall of Fame</h3>
                  <div class="grid" style="gap:10px">
                    <input id="hofName" type="text" placeholder="Name">
                    <input id="hofTeam" type="text" placeholder="Team">
                    <input id="hofYear" type="text" placeholder="Year">
                    <input id="hofAch" type="text" placeholder="Achievement">
                    <button class="btn" id="addHofBtn" type="button">Add Hall of Fame entry</button>
                  </div>
                </div>
              </div>

              <div class="card">
                <div class="pad">
                  <h3 style="margin-top:0">History</h3>
                  <div class="grid" style="gap:10px">
                    <input id="histSeason" type="text" placeholder="Season">
                    <input id="histChampion" type="text" placeholder="Champion">
                    <input id="histRecord" type="text" placeholder="Record">
                    <button class="btn" id="addHistoryBtn" type="button">Add history entry</button>
                  </div>
                </div>
              </div>
            </div>

            <hr class="sep">

            <div class="section-head">
              <div>
                <h3>Games snapshot</h3>
                <p>The schedule is loaded from the workbook and can be edited later by expanding this section.</p>
              </div>
            </div>

            <div class="card" style="overflow:hidden">
              <table class="table">
                <thead>
                  <tr>
                    <th>Week</th><th>Matchup</th><th>Score</th><th>Tag</th>
                  </tr>
                </thead>
                <tbody>
                  ${games.slice(0, 20).map(g => `
                    <tr>
                      <td>${escapeHtml(g.week)}</td>
                      <td>${escapeHtml(g.away)} @ ${escapeHtml(g.home)}</td>
                      <td>${g.home_score == null || g.away_score == null ? 'TBD' : `${g.away_score}-${g.home_score}`}</td>
                      <td>${escapeHtml(g.tag || '')}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  function renderWeekSchedule(week) {
    const games = state.games.filter(g => g.week === week).sort((a,b) => a.home.localeCompare(b.home));
    if (!games.length) return `<div class="note">No games for ${week}.</div>`;
    return games.map(g => {
      const score = (g.home_score != null && g.away_score != null && g.home_score !== "" && g.away_score !== "") ? formatScore(g) : "TBD";
      const tag = g.tag ? `<span class="badge">${escapeHtml(g.tag)}</span>` : "";
      const note = g.note ? `<span class="badge">${escapeHtml(g.note)}</span>` : "";
      const res = resultForGame(g);
      return `
        <div class="game-card">
          <div class="game-left">
            <div class="game-main">${escapeHtml(g.away)} @ ${escapeHtml(g.home)}</div>
            <div class="game-sub">${score}</div>
          </div>
          <div class="inline">${tag}${note}<span class="badge ${res.cls}">${res.text}</span></div>
        </div>`;
    }).join("");
  }

  function mountScheduleTabs() {
    const tabs = document.getElementById("weekTabs");
    const list = document.getElementById("scheduleList");
    if (!tabs || !list) return;
    const weeks = [...new Set(state.games.map(g => g.week))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    const params = new URLSearchParams(window.location.search);
    let current = params.get("week") || weeks[0];
    const update = () => {
      list.innerHTML = renderWeekSchedule(current);
      tabs.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.week === current));
      const url = new URL(window.location.href);
      url.searchParams.set("week", current);
      history.replaceState({}, "", url);
    };
    tabs.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => { current = btn.dataset.week; update(); }));
    update();
  }

  function wireAdmin() {
    const saveSiteBtn = document.getElementById("saveSiteBtn");
    const saveRankingsBtn = document.getElementById("saveRankingsBtn");
    const fillStandingsBtn = document.getElementById("fillStandingsBtn");
    const addHofBtn = document.getElementById("addHofBtn");
    const addHistoryBtn = document.getElementById("addHistoryBtn");
    const exportBtn = document.getElementById("exportBtn");
    const importFile = document.getElementById("importFile");
    const resetBtn = document.getElementById("resetBtn");

    if (saveSiteBtn) {
      saveSiteBtn.addEventListener("click", () => {
        state.site.name = document.getElementById("siteName").value.trim() || DEFAULTS.site.name;
        state.site.tagline = document.getElementById("siteTagline").value.trim() || DEFAULTS.site.tagline;
        state.site.logoFile = document.getElementById("siteLogo").value.trim() || DEFAULTS.site.logoFile;
        saveState();
        render();
      });
    }
    if (saveRankingsBtn) {
      saveRankingsBtn.addEventListener("click", () => {
        const text = document.getElementById("rankingsText").value;
        state.rankingsOrder = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        saveState();
        render();
      });
    }
    if (fillStandingsBtn) {
      fillStandingsBtn.addEventListener("click", () => {
        state.rankingsOrder = computeStandings().overall.map(t => t.team);
        saveState();
        render();
      });
    }
    if (addHofBtn) {
      addHofBtn.addEventListener("click", () => {
        const name = document.getElementById("hofName").value.trim();
        if (!name) return;
        state.hof.unshift({
          name,
          team: document.getElementById("hofTeam").value.trim(),
          year: document.getElementById("hofYear").value.trim(),
          achievement: document.getElementById("hofAch").value.trim(),
        });
        saveState();
        render();
      });
    }
    if (addHistoryBtn) {
      addHistoryBtn.addEventListener("click", () => {
        const season = document.getElementById("histSeason").value.trim();
        if (!season) return;
        state.history.unshift({
          season,
          champion: document.getElementById("histChampion").value.trim(),
          record: document.getElementById("histRecord").value.trim(),
        });
        saveState();
        render();
      });
    }
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ntfl-state.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 500);
      });
    }
    if (importFile) {
      importFile.addEventListener("change", async () => {
        const file = importFile.files?.[0];
        if (!file) return;
        const text = await file.text();
        try {
          state = { ...clone(DEFAULTS), ...JSON.parse(text) };
          saveState();
          render();
        } catch (e) {
          alert("Import failed. Please use a valid JSON export.");
        }
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("Reset all local edits back to the workbook defaults?")) resetState();
      });
    }
  }

  function render() {
    if (page === "team") app.innerHTML = renderHeader() + renderTeamPage() + renderFooter();
    else if (page === "teams") app.innerHTML = renderHeader() + renderTeams() + renderFooter();
    else if (page === "schedule") app.innerHTML = renderHeader() + renderSchedule() + renderFooter();
    else if (page === "standings") app.innerHTML = renderHeader() + renderStandings() + renderFooter();
    else if (page === "rankings") app.innerHTML = renderHeader() + renderRankings() + renderFooter();
    else if (page === "hof") app.innerHTML = renderHeader() + renderHof() + renderFooter();
    else if (page === "history") app.innerHTML = renderHeader() + renderHistory() + renderFooter();
    else if (page === "admin") app.innerHTML = renderHeader() + renderAdmin() + renderFooter();
    else app.innerHTML = renderHeader() + renderHome() + renderFooter();
    if (page === "schedule") mountScheduleTabs();
    if (page === "admin") wireAdmin();
  }

  render();
})();
