let products = [], cat = "All";
const grid = $("#pgrid"), chips = $("#chips"), note = $("#pnote"), dlg = $("#pdlg");

const card = (p, i) => `<article class="pcard" style="--i:${Math.min(i, 12)}">
  <button class="pcard-open" type="button" data-id="${esc(p.id)}" aria-label="View details: ${esc(p.name)}">
    <span class="pcard-media">${p.image_path ? `<img src="${esc(photoUrl(p.image_path))}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : `<span class="pcard-none">No photo</span>`}</span>
    <span class="pcard-body"><span class="pcard-cat">${esc(p.category)}</span><h3>${esc(p.name)}</h3>
      <span class="pcard-code">Code ${esc(p.code)}</span><span class="pcard-price">${esc(money(p.price))}</span></span>
  </button>
  <a class="btn btn-sm pcard-buy" href="${esc(buyUrl(p))}" target="_blank" rel="noopener noreferrer">Buy Now</a>
</article>`;

function render(){
  const shown = cat === "All" ? products : products.filter(p => p.category === cat);
  grid.innerHTML = shown.map(card).join("");
  note.hidden = shown.length > 0;
  if (!shown.length) note.textContent = products.length ? "Nothing in this group yet." : "No products yet. Check back soon, or ask us on WhatsApp.";
}
function renderChips(){
  const cats = ["All", ...new Set(products.map(p => p.category))];
  chips.hidden = cats.length < 3;
  chips.innerHTML = cats.map(c => `<button type="button" aria-pressed="${c === cat}">${esc(c)}</button>`).join("");
}
chips.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  cat = b.textContent; renderChips(); render();
});

grid.addEventListener("click", e => {
  const b = e.target.closest(".pcard-open"); if (!b) return;
  const p = products.find(x => x.id === b.dataset.id); if (!p) return;
  $("#pdImg").innerHTML = p.image_path ? `<img src="${esc(photoUrl(p.image_path))}" alt="${esc(p.name)}">` : `<span class="pcard-none">No photo</span>`;
  $("#pdCat").textContent = p.category;
  $("#pdName").textContent = p.name;
  $("#pdCode").textContent = "Code " + p.code;
  $("#pdPrice").textContent = money(p.price);
  $("#pdDesc").textContent = p.description || "";
  $("#pdBuy").href = buyUrl(p);
  dlg.showModal();
});
$("#pdClose").addEventListener("click", () => dlg.close());
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

listProducts().then(rows => { products = rows || []; renderChips(); render(); })
  .catch(err => { note.hidden = false; note.textContent = "We could not load the products. " + err.message; });
