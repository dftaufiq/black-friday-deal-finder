// DealHunt views: HTML for the deal grid and the deal detail page.
// Every value is escaped before it reaches the page. Prices are formatted
// as USD; the discount is always computed from the two prices, so the
// numbers on screen always add up.

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const money = (n) =>
  `$${Number(n).toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

export const pctOff = (d) => Math.round((1 - d.price / d.was) * 100);

export const saved = (d) => d.was - d.price;

const checkedShort = (iso) => {
  const dt = new Date(iso);
  const day = dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const hm = dt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${day} ${hm} UTC`;
};

// Is this row the cheapest listing of its product? Returns the label to show.
export function bestPriceLabel(d) {
  const rivals = (d.also || []).filter((a) => a.price < d.price);
  if (rivals.length === 0) return null;
  const cheapest = rivals.reduce((a, b) => (a.price < b.price ? a : b));
  return `Best price: ${cheapest.store} ${money(cheapest.price)}`;
}

export function isCheapest(d) {
  return (d.also || []).every((a) => a.price >= d.price);
}

function signalBadge(d) {
  const cls =
    d.signal === "NEW LOW"
      ? "sig-newlow"
      : d.signal === "STRONG"
        ? "sig-strong"
        : "sig-routine";
  return `<span class="sig ${cls}">${esc(d.signal)}</span>`;
}

export function card(d) {
  const best = isCheapest(d) && d.also.length > 0;
  const other = bestPriceLabel(d);
  return `<article class="card">
  <div class="card-top">
    <span class="store">${esc(d.store)}</span>
    <span class="cat">${esc(d.category)}</span>
    ${best ? `<span class="best">★ BEST PRICE</span>` : ""}
  </div>
  <h3><a href="#/deal/${encodeURIComponent(d.id)}">${esc(d.title)}</a></h3>
  <div class="price-row">
    <span class="price">${money(d.price)}</span>
    <span class="was"><s>${money(d.was)}</s></span>
    <span class="off">−${pctOff(d)}%</span>
  </div>
  <div class="sig-row">${signalBadge(d)}<span class="evidence">${esc(d.evidence)}</span></div>
  ${other ? `<div class="compare-note">${esc(other)}</div>` : ""}
  <div class="meta">Checked ${checkedShort(d.checked)} · ${esc(d.source)}</div>
  <div class="card-actions">
    <a class="btn-store" href="${esc(d.url)}" rel="noopener" target="_blank">View at ${esc(d.store)} ↗</a>
    <a class="btn-detail" href="#/deal/${encodeURIComponent(d.id)}">Details →</a>
  </div>
</article>`;
}

export function grid(deals) {
  if (deals.length === 0) {
    return `<p class="empty">No deals match these filters. Try clearing the search or picking another category.</p>`;
  }
  return `<div class="grid">${deals.map(card).join("")}</div>`;
}

export function compareTable(d) {
  const rows = [{ store: d.store, price: d.price, mine: true }]
    .concat((d.also || []).map((a) => ({ store: a.store, price: a.price, mine: false })))
    .sort((a, b) => a.price - b.price);
  const body = rows
    .map(
      (r) =>
        `<tr${r.mine ? ` class="mine"` : ""}><td>${esc(r.store)}</td><td class="num">${money(r.price)}</td><td>${r.mine ? "This listing" : r.price === rows[0].price ? "Best price" : `${money(r.price - rows[0].price)} more`}</td></tr>`,
    )
    .join("");
  return `<table class="compare">
  <thead><tr><th>Store</th><th>Price</th><th>Note</th></tr></thead>
  <tbody>${body}</tbody>
</table>`;
}

export function detail(d) {
  const other = bestPriceLabel(d);
  return `<p class="back"><a href="#/">← All deals</a></p>
<div class="detail">
  <div class="detail-head">
    <div class="card-top">
      <span class="store">${esc(d.store)}</span>
      <span class="cat">${esc(d.category)}</span>
      ${isCheapest(d) && d.also.length > 0 ? `<span class="best">★ BEST PRICE</span>` : ""}
    </div>
    <h1>${esc(d.title)}</h1>
    <div class="price-row big">
      <span class="price">${money(d.price)}</span>
      <span class="was"><s>${money(d.was)}</s></span>
      <span class="off">−${pctOff(d)}%</span>
      <span class="saved">You save ${money(saved(d))}</span>
    </div>
    <div class="sig-row">${signalBadge(d)}<span class="evidence">${esc(d.evidence)}</span></div>
    ${other ? `<div class="compare-note">${esc(other)}</div>` : ""}
    <p><a class="btn-store big-btn" href="${esc(d.url)}" rel="noopener" target="_blank">View at ${esc(d.store)} ↗</a></p>
  </div>
  <div class="detail-cols">
    <section>
      <h2>Same product, other stores</h2>
      ${d.also.length > 0 ? compareTable(d) : `<p>No other store price was checked for this product in this round.</p>`}
    </section>
    <section>
      <h2>How this price was checked</h2>
      <dl class="facts">
        <dt>Store</dt><dd>${esc(d.store)}</dd>
        <dt>Category</dt><dd>${esc(d.category)}</dd>
        <dt>Sale price</dt><dd>${money(d.price)}</dd>
        <dt>Usual price</dt><dd>${money(d.was)} (${pctOff(d)}% off, save ${money(saved(d))})</dd>
        <dt>Checked</dt><dd>${checkedShort(d.checked)}</dd>
        <dt>Read in</dt><dd>${esc(d.source)}</dd>
        <dt>Signal</dt><dd>${esc(d.signal)} — ${esc(d.evidence)}</dd>
      </dl>
    </section>
  </div>
</div>`;
}

export function missing() {
  return `<h1>Deal not found</h1>
<p>There is no deal at this address. <a href="#/">See all deals</a>.</p>`;
}
