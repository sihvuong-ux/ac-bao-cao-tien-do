const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const state = { tasks: {} };
function toast(m) {
  var e = document.createElement("div");
  e.className = "toast";
  e.textContent = m;
  document.body.appendChild(e);
  setTimeout(function () { e.remove(); }, 1800);
}
function loadLocal() {
  try { return JSON.parse(localStorage.getItem("ac_tasks") || "{}"); } catch (err) { return {}; }
}
function saveLocal() { localStorage.setItem("ac_tasks", JSON.stringify(state.tasks)); }
function calcPercent(items) {
  if (!items || !items.length) return 0;
  var n = 0;
  for (var i = 0; i < items.length; i++) if (items[i].done) n++;
  return Math.round(100 * n / items.length);
}
function route() {
  var h = location.hash.replace("#", "");
  if (h.indexOf("t/") === 0) return { name: "task", code: h.slice(2).toUpperCase() };
  return { name: "home" };
}
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}
async function bootData() {
  var local = loadLocal();
  try {
    var r = await fetch("tasks.json", { cache: "no-store" });
    if (r.ok) {
      var data = await r.json();
      var seed = data.tasks || {};
      var merged = {};
      var k;
      for (k in seed) merged[k] = seed[k];
      for (k in local) merged[k] = local[k];
      state.tasks = merged;
      if (!Object.keys(local).length) saveLocal();
      return;
    }
  } catch (err) {}
  state.tasks = local;
}
function renderHome() {
  var tasks = Object.keys(state.tasks).map(function (k) { return state.tasks[k]; });
  tasks.sort(function (a, b) { return Number(!!b.hot) - Number(!!a.hot); });
  var html = "<div class=\"card\"><h2>Danh sach task</h2><div class=\"task-list\" id=\"list\"></div></div>";
  $("#app").innerHTML = html;
  var out = "";
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    out += "<a class=\"task-row" + (t.hot ? " hot" : "") + "\" href=\"#t/" + t.code + "\"><div>";
    out += "<h3>" + escapeHtml(t.title) + "</h3>";
    out += "<div class=\"meta\"><span class=\"code\">" + escapeHtml(t.ma || t.code) + "</span> · " + escapeHtml(t.assignee || "");
    if (t.due) out += " · han " + escapeHtml(t.due);
    if (t.hot) out += " · NONG";
    out += "</div>";
    if (t.next_step) out += "<div class=\"next\">Lam tiep: " + escapeHtml(t.next_step) + "</div>";
    out += "<div class=\"bar\"><span style=\"width:" + (t.percent || 0) + "%\"></span></div></div>";
    out += "<span class=\"badge badge-open\">" + (t.percent || 0) + "%</span></a>";
  }
  $("#list").innerHTML = out || "<p class=\"empty\">Chua co task.</p>";
}
function renderTask(task) {
  if (!task) {
    $("#app").innerHTML = "<div class=\"card\"><p>Khong tim thay.</p><a class=\"btn btn-ghost\" href=\"#\">Ve danh sach</a></div>";
    return;
  }
  var html = "<div class=\"card\"><div class=\"meta\">Ma <span class=\"code\">" + task.code + "</span></div>";
  html += "<h2>" + escapeHtml(task.title) + "</h2>";
  html += "<div class=\"meta\">" + escapeHtml(task.assignee || "") + (task.due ? " · han " + escapeHtml(task.due) : "") + "</div>";
  if (task.next_step) html += "<div class=\"nextbox\"><b>Lam tiep:</b> " + escapeHtml(task.next_step) + "</div>";
  html += "<div class=\"bar\"><span style=\"width:" + (task.percent || 0) + "%\"></span></div>";
  if (task.detail) html += "<p>" + escapeHtml(task.detail).replace(/\n/g, "<br>") + "</p>";
  html += "<div class=\"actions\"><a class=\"btn btn-ghost\" href=\"#\">Ve danh sach</a></div></div>";
  html += "<div class=\"card\"><h2>Checklist</h2><div id=\"items\"></div></div>";
  html += "<div class=\"card\"><h2>Ghi tien do</h2><input id=\"by\" placeholder=\"Ten\"><textarea id=\"note\"></textarea>";
  html += "<div class=\"actions\"><button class=\"btn btn-primary\" id=\"save-note\" type=\"button\">Luu</button></div><div id=\"logs\"></div></div>";
  $("#app").innerHTML = html;
  var items = task.items || [];
  var out = "";
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    out += "<label class=\"item" + (it.done ? " done" : "") + "\"><input type=\"checkbox\" data-id=\"" + it.id + "\"" + (it.done ? " checked" : "") + ">" + escapeHtml(it.text) + "</label>";
  }
  $("#items").innerHTML = out;
  $$("#items input").forEach(function (box) {
    box.addEventListener("change", function () {
      var id = box.getAttribute("data-id");
      for (var j = 0; j < task.items.length; j++) if (task.items[j].id === id) task.items[j].done = !task.items[j].done;
      task.percent = calcPercent(task.items);
      saveLocal();
      renderTask(task);
    });
  });
  $("#save-note").onclick = function () {
    var note = $("#note").value.trim();
    if (!note) return;
    task.logs = task.logs || [];
    task.logs.unshift({ at: new Date().toISOString().slice(0, 19), by: $("#by").value || "Team", note: note, percent: task.percent });
    saveLocal();
    renderTask(task);
    toast("Da luu");
  };
}
async function boot() {
  await bootData();
  var r = route();
  if (r.name === "task") renderTask(state.tasks[r.code]);
  else renderHome();
}
window.addEventListener("hashchange", boot);
boot();
