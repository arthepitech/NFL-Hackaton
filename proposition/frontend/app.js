// NFL Play Explorer - frontend vanilla + 3D
import { Field3D } from "./field3d.js";

const api = (path) => fetch(path).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- Navigation par onglets -------------------------------------------------
$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const view = tab.dataset.view;
    $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    $$(".view").forEach((v) => v.classList.remove("active"));
    $(`#view-${view}`).classList.add("active");
    if (view === "coverage") initCoverage();
    if (view === "pressure") initPressure();
  });
});

// ---- État global ------------------------------------------------------------
const state = {
  weeks: [],
  currentGame: null,
  gameHasTracking: false,
  plays: [],
  currentPlay: null,
  frames: [],
  frameIdx: 0,
  playing: false,
  timer: null,
};

// ---- Chargement des matchs --------------------------------------------------
async function initExplorer() {
  const data = await api("/api/games");
  state.weeks = data.weeks;
  const weekSel = $("#week-select");
  weekSel.innerHTML = state.weeks
    .map((w) => `<option value="${w.week}">Semaine ${w.week}</option>`)
    .join("");
  weekSel.addEventListener("change", renderGameList);
  renderGameList();
}

function renderGameList() {
  const week = Number($("#week-select").value);
  const wk = state.weeks.find((w) => w.week === week);
  const list = $("#game-list");
  list.innerHTML = wk.games
    .map(
      (g) => `<li data-gid="${g.gameId}">
        <strong>${g.visitorTeamAbbr} @ ${g.homeTeamAbbr}</strong>
        <div class="pl-meta">${g.gameDate}</div>
      </li>`
    )
    .join("");
  list.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", () => {
      list.querySelectorAll("li").forEach((x) => x.classList.remove("selected"));
      li.classList.add("selected");
      loadGame(Number(li.dataset.gid), li.querySelector("strong").textContent);
    });
  });
}

async function loadGame(gameId, title) {
  stopAnimation();
  state.currentGame = gameId;
  const data = await api(`/api/games/${gameId}/plays`);
  state.plays = data.plays;
  state.gameHasTracking = data.hasTracking;
  state.teamColors = data.teamColors || {};
  $("#empty-hint").classList.add("hidden");
  $("#play-browser").classList.remove("hidden");
  $("#matchup-title").textContent = title.trim();
  if (!state.gameHasTracking) {
    $("#matchup-title").innerHTML +=
      ` <span class="badge">tracking non chargé pour ce match</span>`;
  }
  $("#play-search").value = "";
  renderPlayList(state.plays);
}

function playBadges(p) {
  let b = "";
  const desc = (p.description || "").toLowerCase();
  if (desc.includes("touchdown")) b += `<span class="badge td">TD</span>`;
  if (p.passResult === "I") b += `<span class="badge incomplete">incomplète</span>`;
  if (p.passResult === "S") b += `<span class="badge">sack</span>`;
  if (p.passResult === "IN") b += `<span class="badge">interception</span>`;
  if (p.passCoverage) b += `<span class="badge cov">${p.passCoverage}</span>`;
  return b;
}

function renderPlayList(plays) {
  const list = $("#play-list");
  list.innerHTML = plays
    .map(
      (p) => `<li data-pid="${p.playId}">
        <div>${playBadges(p)}</div>
        <div class="pl-meta">Q${p.quarter ?? "?"} · ${p.down ?? "?"}&amp;${p.yardsToGo ?? "?"} · ${p.possessionTeam} contre ${p.defensiveTeam}</div>
        <div>${(p.description || "").slice(0, 110)}</div>
      </li>`
    )
    .join("");
  list.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", () => {
      list.querySelectorAll("li").forEach((x) => x.classList.remove("selected"));
      li.classList.add("selected");
      loadPlay(Number(li.dataset.pid));
    });
  });
}

$("#play-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = state.plays.filter(
    (p) =>
      (p.description || "").toLowerCase().includes(q) ||
      (p.passCoverage || "").toLowerCase().includes(q)
  );
  renderPlayList(filtered);
});

// ---- Détail + tracking d'un play -------------------------------------------
async function loadPlay(playId) {
  stopAnimation();
  const gid = state.currentGame;
  const detail = await api(`/api/plays/${gid}/${playId}`);
  state.currentPlay = detail;
  renderPlayInfo(detail);

  const track = await api(`/api/plays/${gid}/${playId}/tracking`);
  state.frames = track.frames || [];
  state.possession = track.possessionTeam;
  if (state.frames.length === 0) {
    $("#field-wrap").classList.add("hidden");
    $("#play-info").innerHTML +=
      `<div class="muted" style="margin-top:10px">Pas de données de tracking pour cette action (match non chargé).</div>`;
    return;
  }
  $("#field-wrap").classList.remove("hidden");

  ensureField3D();
  field3d.setColors(track.colors);
  field3d.reset();
  updateLegend(track);

  const slider = $("#frame-slider");
  slider.max = state.frames.length - 1;
  slider.value = 0;
  state.frameIdx = 0;
  drawFrame(0);
}

function updateLegend(track) {
  const off = track.colors?.offense?.primary || "#ff5c5c";
  const def = track.colors?.defense?.primary || "#4d9fff";
  $("#leg-off").style.background = off;
  $("#leg-def").style.background = def;
  $("#leg-off-txt").textContent = `Offense (${track.possessionTeam || "?"})`;
  $("#leg-def-txt").textContent = `Défense (${track.defensiveTeam || "?"})`;
}

function renderPlayInfo(p) {
  const info = $("#play-info");
  info.classList.remove("hidden");
  let html = `<div class="desc">${p.description || ""}</div>`;
  html += `<div>`;
  if (p.offenseFormation) html += `<span class="badge">${p.offenseFormation}</span>`;
  if (p.passCoverage) html += `<span class="badge cov">${p.passCoverage} (${p.passCoverageType || "?"})</span>`;
  if (p.playResult != null) html += `<span class="badge">${p.playResult} yards</span>`;
  html += `</div>`;
  if (p.coverageExplain) {
    html += `<div class="cov-explain">🛡️ ${p.coverageExplain}</div>`;
  }
  info.innerHTML = html;
}

// ---- Rendu 3D (Three.js) ----------------------------------------------------
let field3d = null;

function ensureField3D() {
  if (!field3d) {
    field3d = new Field3D($("#scene3d"));
  }
  return field3d;
}

function drawFrame(idx) {
  const frame = state.frames[idx];
  if (!frame || !field3d) return;
  field3d.renderFrame(frame);
  $("#frame-label").textContent = `${idx + 1} / ${state.frames.length}`;
  $("#event-label").textContent =
    frame.event && frame.event !== "None" ? `⚡ ${translateEvent(frame.event)}` : "";
  $("#frame-slider").value = idx;
}

function translateEvent(ev) {
  const map = {
    ball_snap: "Snap (engagement)",
    pass_forward: "Passe avant",
    autoevent_passforward: "Passe avant",
    pass_arrived: "Ballon arrivé",
    pass_outcome_caught: "Réception",
    pass_outcome_incomplete: "Passe incomplète",
    pass_outcome_interception: "Interception",
    play_action: "Feinte de course (play action)",
    tackle: "Plaquage",
    first_contact: "Premier contact",
    qb_sack: "Sack du QB",
    fumble: "Fumble",
    touchdown: "Touchdown !",
    man_in_motion: "Joueur en mouvement",
    line_set: "Ligne en place",
  };
  return map[ev] || ev;
}

$("#btn-cam").addEventListener("click", () => {
  if (field3d) field3d.cycleCamera();
});

$("#frame-slider").addEventListener("input", (e) => {
  stopAnimation();
  state.frameIdx = Number(e.target.value);
  drawFrame(state.frameIdx);
});

$("#btn-play").addEventListener("click", () => {
  if (state.playing) stopAnimation();
  else startAnimation();
});

function startAnimation() {
  if (state.frames.length === 0) return;
  state.playing = true;
  $("#btn-play").textContent = "⏸ Pause";
  if (state.frameIdx >= state.frames.length - 1) state.frameIdx = 0;
  state.timer = setInterval(() => {
    drawFrame(state.frameIdx);
    state.frameIdx++;
    if (state.frameIdx >= state.frames.length) stopAnimation();
  }, 100); // 10 fps ~ cadence du tracking
}

function stopAnimation() {
  state.playing = false;
  $("#btn-play").textContent = "▶ Lire";
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

// ---- Vue Coverage -----------------------------------------------------------
let coverageInit = false;
async function initCoverage() {
  if (coverageInit) return;
  coverageInit = true;
  // récupère la liste des équipes depuis les matchs
  const teams = new Set();
  state.weeks.forEach((w) =>
    w.games.forEach((g) => {
      teams.add(g.homeTeamAbbr);
      teams.add(g.visitorTeamAbbr);
    })
  );
  const sel = $("#team-select");
  sel.innerHTML = [...teams]
    .sort()
    .map((t) => `<option value="${t}">${t}</option>`)
    .join("");
  sel.addEventListener("change", () => renderCoverage(sel.value));
  renderCoverage(sel.value);
}

async function renderCoverage(team) {
  const data = await api(`/api/teams/${team}/coverage`);
  const max = Math.max(...data.coverage.map((c) => c.n), 1);
  const rows = data.coverage
    .map((c) => {
      const w = Math.round((c.n / max) * 100);
      return `<div class="cov-row">
        <div>
          <div class="cov-name">${c.passCoverage}</div>
          <div class="cov-sub">${c.coverageExplain || ""}</div>
        </div>
        <div class="bar-wrap"><div class="bar" style="width:${w}%"></div></div>
        <div class="num">${c.n} actions<br><span class="cov-sub">${c.avgYards ?? "–"} yds/moy</span></div>
      </div>`;
    })
    .join("");
  $("#coverage-result").innerHTML = rows || `<p class="muted">Pas de données.</p>`;
}

// ---- Vue Pressure -----------------------------------------------------------
let pressureInit = false;
async function initPressure() {
  if (pressureInit) return;
  pressureInit = true;
  const data = await api("/api/leaderboard/pressure");
  const head = `<div class="lb-row lb-head">
    <div>#</div><div>Joueur</div>
    <div class="num">Hits</div><div class="num">Hurries</div>
    <div class="num">Sacks</div><div class="num">Total</div>
  </div>`;
  const rows = data.leaderboard
    .map(
      (p, i) => `<div class="lb-row">
        <div>${i + 1}</div>
        <div>${p.displayName} <span class="cov-sub">(${p.position || "?"})</span></div>
        <div class="num">${p.hits}</div>
        <div class="num">${p.hurries}</div>
        <div class="num">${p.sacks}</div>
        <div class="num pill">${p.pressure}</div>
      </div>`
    )
    .join("");
  $("#pressure-result").innerHTML = head + rows;
}

// ---- Démarrage --------------------------------------------------------------
initExplorer().catch((e) => {
  $("#empty-hint").textContent = "Erreur de chargement : " + e.message;
});
