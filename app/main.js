// DealHunt controller: hash routes, search, filters and sorting.
//   #/                          the deal grid
//   #/deal/<id>                 one deal, with its cross-store comparison
//   #/?cat=Audio&sort=discount  the grid, pre-filtered (shareable view)
//
// The grid re-renders on every keystroke and control change, with no
// network request: all 60 deals live in data.js. window.__shotReady is
// false while a page renders and true once it is on screen, so a
// screenshot script knows when to capture.

import { deals, CHECKED_WINDOW } from "./data.js";
import { grid, detail, missing, pctOff, saved } from "./views.js";

const app = document.getElementById("app");
const count = document.getElementById("count");

const CATEGORIES = [...new Set(deals.map((d) => d.category))].sort();
const STORES = [...new Set(deals.map((d) => d.store))].sort();

const state = { q: "", cat: "All", store: "All", minOff: 0, sort: "discount" };

const SORTS = {
  discount: (a, b) => pctOff(b) - pctOff(a) || saved(b) - saved(a),
  saved: (a, b) => saved(b) - saved(a) || pctOff(b) - pctOff(a),
  price: (a, b) => a.price - b.price || pctOff(b) - pctOff(a),
  newlow: (a, b) =>
    (a.signal === "NEW LOW" ? 0 : 1) - (b.signal === "NEW LOW" ? 0 : 1) ||
    pctOff(b) - pctOff(a),
};

function applyFilters() {
  const q = state.q.trim().toLowerCase();
  const shown = deals
    .filter((d) => state.cat === "All" || d.category === state.cat)
    .filter((d) => state.store === "All" || d.store === state.store)
    .filter((d) => pctOff(d) >= state.minOff)
    .filter(
      (d) =>
        q === "" ||
        `${d.title} ${d.store} ${d.category} ${d.signal}`.toLowerCase().includes(q),
    )
    .sort(SORTS[state.sort] || SORTS.discount);
  return shown;
}

const escAttr = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function controlsHTML() {
  const catOpts = ["All", ...CATEGORIES]
    .map((c) => `<option${c === state.cat ? " selected" : ""}>${c}</option>`)
    .join("");
  const storeOpts = ["All", ...STORES]
    .map((s) => `<option${s === state.store ? " selected" : ""}>${s}</option>`)
    .join("");
  return `<div class="controls">
  <label class="search-box">Search <input id="q" type="search" placeholder="AirPods, LEGO, TV…" value="${escAttr(state.q)}"></label>
  <label>Category <select id="cat">${catOpts}</select></label>
  <label>Store <select id="store">${storeOpts}</select></label>
  <label>Min. discount <select id="minoff">
    <option value="0"${state.minOff === 0 ? " selected" : ""}>Any</option>
    <option value="30"${state.minOff === 30 ? " selected" : ""}>30% off+</option>
    <option value="50"${state.minOff === 50 ? " selected" : ""}>50% off+</option>
  </select></label>
  <label>Sort <select id="sort">
    <option value="discount"${state.sort === "discount" ? " selected" : ""}>Biggest discount</option>
    <option value="saved"${state.sort === "saved" ? " selected" : ""}>Biggest $ saved</option>
    <option value="price"${state.sort === "price" ? " selected" : ""}>Lowest price</option>
    <option value="newlow"${state.sort === "newlow" ? " selected" : ""}>New lowest first</option>
  </select></label>
</div>`;
}

function renderList() {
  const shown = applyFilters();
  const newLow = deals.filter((d) => d.signal === "NEW LOW").length;
  count.textContent = `${shown.length} of ${deals.length} deals · ${newLow} new lows · ${STORES.length} stores · checked ${CHECKED_WINDOW}`;
  app.innerHTML = controlsHTML() + grid(shown);
  const q = document.getElementById("q");
  q.addEventListener("input", () => {
    state.q = q.value;
    renderList();
    const again = document.getElementById("q");
    again.focus();
    again.setSelectionRange(again.value.length, again.value.length);
  });
  document.getElementById("cat").addEventListener("change", (e) => {
    state.cat = e.target.value;
    renderList();
  });
  document.getElementById("store").addEventListener("change", (e) => {
    state.store = e.target.value;
    renderList();
  });
  document.getElementById("minoff").addEventListener("change", (e) => {
    state.minOff = Number(e.target.value);
    renderList();
  });
  document.getElementById("sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderList();
  });
}

function render() {
  window.__shotReady = false;
  const hash = location.hash || "#/";
  const dealMatch = hash.match(/^#\/deal\/([^/?]+)/);
  document.body.classList.toggle("detail-view", Boolean(dealMatch));
  if (dealMatch) {
    const found = deals.find((d) => d.id === decodeURIComponent(dealMatch[1]));
    document.title = `${found ? found.title : "Not found"} | DealHunt`;
    count.textContent = found
      ? `${found.store} · ${found.category} · checked ${CHECKED_WINDOW}`
      : "";
    app.innerHTML = found ? detail(found) : missing();
  } else {
    // Optional pre-filter from the hash query, e.g. #/?cat=Audio&sort=discount
    const query = hash.split("?")[1] || "";
    const params = new URLSearchParams(query);
    const cat = params.get("cat");
    const store = params.get("store");
    const sort = params.get("sort");
    if (cat && (cat === "All" || CATEGORIES.includes(cat))) state.cat = cat;
    if (store && (store === "All" || STORES.includes(store))) state.store = store;
    if (sort && SORTS[sort]) state.sort = sort;
    document.title = "DealHunt — Black Friday 2026";
    renderList();
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener("hashchange", render);
render();
