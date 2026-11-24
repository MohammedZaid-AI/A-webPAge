/* Admin: sign in, then add, edit and delete products. Only a signed-in user can write (see supabase.sql). */
const TOKEN_KEY = "gc-admin-token";
const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch(e){ return null; } };
const setToken = t => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch(e){} };

const loginForm = $("#login"), panel = $("#panel"), signOut = $("#signOut");
const form = $("#pform"), list = $("#list"), listNote = $("#listNote");
const formStatus = $("#formStatus"), loginStatus = $("#loginStatus");
let products = [], editing = null, picked = null;
/* "" -> null (ask for price); "12,50" or "QAR 12.5" -> 12.5; anything else -> NaN */
const toPrice = text => {
  const t = String(text).replace(/qar/i, "").trim().replace(",", ".");
  return t === "" ? null : Math.round(Number(t) * 100) / 100;
};

function show(signedIn){
  loginForm.hidden = signedIn; panel.hidden = !signedIn; signOut.hidden = !signedIn;
  if (signedIn) refresh();
}
function expired(){ setToken(null); show(false); loginStatus.textContent = "Your session ended. Sign in again."; }
/* every write goes through here so an ended session returns to the sign-in form */
const write = async (path, opts) => {
  try { return await sb(path, { token: getToken(), ...opts }); }
  catch(e){ if (e.status === 401 || e.status === 403) expired(); throw e; }
};

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const f = new FormData(loginForm);
  loginStatus.textContent = "Signing in…";
  try {
    const r = await sb("/auth/v1/token?grant_type=password", { method: "POST", body: { email: f.get("email").trim(), password: f.get("password") } });
    setToken(r.access_token); loginForm.reset(); loginStatus.textContent = ""; show(true);
  } catch(err){
    loginStatus.textContent = err.status === 400 ? "Wrong email or password." : err.message;
  }
});
signOut.addEventListener("click", () => {
  sb("/auth/v1/logout", { method: "POST", token: getToken() }).catch(() => {});   // revoke the session server-side too
  setToken(null); resetForm(); show(false); });

/* ----- list ----- */
async function refresh(){
  try { products = await listProducts() || []; } catch(e){ listNote.textContent = e.message; return; }
  $("#cats").innerHTML = [...new Set(products.map(p => p.category))].map(c => `<option value="${esc(c)}">`).join("");
  listNote.textContent = products.length ? "" : "No products yet. Add the first one with the form.";
  list.innerHTML = products.map(p => `<li class="adm-row" data-id="${esc(p.id)}">
    <span class="adm-thumb">${p.image_path ? `<img src="${esc(photoUrl(p.image_path))}" alt="" loading="lazy">` : ""}</span>
    <span class="adm-info"><b>${esc(p.name)}</b><small>${esc(p.category)} · ${esc(p.code)} · ${esc(money(p.price))}</small></span>
    <button class="btn btn-sm btn-ghost" type="button" data-act="edit">Edit</button>
    <button class="btn btn-sm btn-ghost" type="button" data-act="delete">Delete</button>
  </li>`).join("");
}
list.addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  const p = products.find(x => x.id === b.closest(".adm-row").dataset.id);
  if (b.dataset.act === "edit") return startEdit(p);
  if (!b.dataset.sure){   // delete asks twice, so one stray tap removes nothing
    b.dataset.sure = "1"; b.textContent = "Confirm delete";
    setTimeout(() => { delete b.dataset.sure; b.textContent = "Delete"; }, 4000);
    return;
  }
  try {
    await write(`/rest/v1/products?id=eq.${encodeURIComponent(p.id)}`, { method: "DELETE" });
    removePhoto(p.image_path);
    if (editing && editing.id === p.id) resetForm();
    refresh();
  } catch(err){ listNote.textContent = "Could not delete: " + err.message; }
});

/* ----- form ----- */
function resetForm(){
  editing = null; picked = null; form.reset();
  $("#preview").hidden = true; $("#cancelBtn").hidden = true;
  $("#formTitle").textContent = "Add a product"; formStatus.textContent = "";
}
function startEdit(p){
  resetForm(); editing = p;
  for (const k of ["name", "category", "code", "description"]) form.elements[k].value = p[k] || "";
  form.elements.price.value = p.price ?? "";
  if (p.image_path){ $("#preview img").src = photoUrl(p.image_path); $("#preview").hidden = false; }
  $("#formTitle").textContent = "Edit product"; $("#cancelBtn").hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#cancelBtn").addEventListener("click", resetForm);

/* shrink phone photos to 1200px JPEG before upload, so pages stay fast */
function shrink(file, max = 1200){
  return new Promise((ok, fail) => {
    const img = new Image(), r = new FileReader();
    r.onload = () => { img.src = r.result; };
    r.onerror = () => fail(new Error("Could not read that file."));
    img.onerror = () => fail(new Error("That file is not an image."));
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(blob => blob ? ok({ blob, preview: c.toDataURL("image/jpeg", .85) }) : fail(new Error("Could not process that image.")), "image/jpeg", .85);
    };
    r.readAsDataURL(file);
  });
}
$("#photo").addEventListener("change", async e => {
  const file = e.target.files[0]; picked = null;
  if (!file) return;
  try {
    picked = await shrink(file);
    $("#preview img").src = picked.preview; $("#preview").hidden = false; formStatus.textContent = "";
  } catch(err){ e.target.value = ""; formStatus.textContent = err.message; }
});
const removePhoto = path => { if (path) write(`/storage/v1/object/${SB.bucket}/${path}`, { method: "DELETE" }).catch(() => {}); };

form.addEventListener("submit", async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  const name = f.name.trim(), category = f.category.trim(), code = f.code.trim();
  const price = toPrice(f.price);
  if (!name || !category || !code) return formStatus.textContent = "Fill in the name, type and code.";
  if (price !== null && !(price >= 0)) return formStatus.textContent = "Price must be a number, or leave it empty.";
  if (!picked && !(editing && editing.image_path)) return formStatus.textContent = "Choose a photo for this product.";

  formStatus.textContent = "Saving…"; $("#saveBtn").disabled = true;
  const row = { name, category, code, description: f.description.trim(), price };
  try {
    if (picked){
      row.image_path = crypto.randomUUID() + ".jpg";
      await write(`/storage/v1/object/${SB.bucket}/${row.image_path}`, { method: "POST", file: picked.blob, headers: { "Content-Type": "image/jpeg" } });
    }
    if (editing) await write(`/rest/v1/products?id=eq.${encodeURIComponent(editing.id)}`, { method: "PATCH", body: row });
    else await write("/rest/v1/products", { method: "POST", body: row });
    if (picked && editing) removePhoto(editing.image_path);
    resetForm(); formStatus.textContent = "Saved. It is now on the Products page.";
    refresh();
  } catch(err){
    if (picked && row.image_path) removePhoto(row.image_path);
    formStatus.textContent = err.code === "23505" ? "Another product already uses that code." : "Could not save: " + err.message;
  } finally { $("#saveBtn").disabled = false; }
});

/* ----- import from Excel ----- */
/* headings are matched loosely ("Product code", "code", "SKU" ...) so the admin's own sheet usually works as is */
const HEADINGS = {
  name: ["productname", "name", "product"],
  category: ["producttype", "type", "category"],
  code: ["productcode", "code", "sku"],
  description: ["description", "details"],
  price: ["price", "priceqar", "priceinqar"]
};
const LIMITS = { name: 120, category: 60, code: 40, description: 2000 };   // same limits as supabase.sql
const iform = $("#iform"), importStatus = $("#importStatus"), importErrors = $("#importErrors"), importBtn = $("#importBtn");
let importRows = [];

function sheetToProducts(rows){
  const head = (rows[0] || []).map(h => String(h).toLowerCase().replace(/[^a-z]/g, ""));
  const col = {};
  for (const [k, names] of Object.entries(HEADINGS)) col[k] = head.findIndex(h => names.includes(h));
  const missing = ["name", "category", "code"].filter(k => col[k] < 0);
  if (missing.length) return { errors: ["The first row needs the headings " + missing.map(k => ({ name: "Product name", category: "Product type", code: "Product code" })[k]).join(", ") + "."], products: [] };

  const errors = [], products = [], seen = new Map();
  rows.slice(1).forEach((r, i) => {
    const line = i + 2, cell = k => col[k] < 0 ? "" : String(r[col[k]] ?? "").trim();
    if (r.every(v => String(v).trim() === "")) return;   // blank row
    const p = { name: cell("name"), category: cell("category"), code: cell("code"), description: cell("description"), price: toPrice(cell("price")) };
    const problems = [];
    for (const k of ["name", "category", "code"]) if (!p[k]) problems.push(`no ${k === "category" ? "type" : k}`);
    for (const [k, max] of Object.entries(LIMITS)) if (p[k].length > max) problems.push(`${k} is longer than ${max} characters`);
    if (p.price !== null && !(p.price >= 0)) problems.push(`price "${cell("price")}" is not a number`);
    if (p.code && seen.has(p.code)) problems.push(`code ${p.code} is also on row ${seen.get(p.code)}`);
    if (problems.length) return errors.push(`Row ${line}: ${problems.join(", ")}.`);
    for (const k of ["description", "price"]) if (col[k] < 0) delete p[k];   // a missing column leaves existing values alone
    seen.set(p.code, line); products.push(p);
  });
  return { errors, products };
}

$("#sheet").addEventListener("change", async e => {
  const file = e.target.files[0];
  importRows = []; importBtn.disabled = true; importErrors.hidden = true; importStatus.textContent = "";
  if (!file) return;
  try {
    const { errors, products: rows } = sheetToProducts(await readXlsx(file));
    importErrors.innerHTML = errors.map(x => `<li>${esc(x)}</li>`).join(""); importErrors.hidden = !errors.length;
    if (!rows.length) return importStatus.textContent = errors.length ? "Nothing to import. Fix the rows above and choose the file again." : "The sheet has no products.";
    const codes = new Set(products.map(p => p.code)), updates = rows.filter(p => codes.has(p.code)).length;
    importRows = rows; importBtn.disabled = false;
    importStatus.textContent = `Ready: ${rows.length - updates} new, ${updates} to update` + (errors.length ? `. ${errors.length} rows above will be skipped.` : ".");
  } catch(err){ importStatus.textContent = err.message; }
});

iform.addEventListener("submit", async e => {
  e.preventDefault();
  if (!importRows.length) return;
  importBtn.disabled = true; importStatus.textContent = "Importing…";
  try {
    /* one request, so the whole sheet saves or none of it does; an existing code updates that row and keeps its photo */
    await write("/rest/v1/products?on_conflict=code", { method: "POST", body: importRows, headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    importStatus.textContent = `Imported ${importRows.length} products. They are now on the Products page.`;
    importRows = []; iform.reset(); importErrors.hidden = true;
    refresh();
  } catch(err){
    importStatus.textContent = "Could not import, nothing was saved: " + err.message;
    importBtn.disabled = false;
  }
});

show(!!getToken());
