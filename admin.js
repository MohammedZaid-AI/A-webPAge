/* Admin: sign in, then add, edit and delete products. Only a signed-in user can write (see supabase.sql). */
const TOKEN_KEY = "gc-admin-token";
const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch(e){ return null; } };
const setToken = t => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch(e){} };

const loginForm = $("#login"), panel = $("#panel"), signOut = $("#signOut");
const form = $("#pform"), list = $("#list"), listNote = $("#listNote");
const formStatus = $("#formStatus"), loginStatus = $("#loginStatus");
let products = [], editing = null, picked = null;

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
signOut.addEventListener("click", () => { setToken(null); resetForm(); show(false); });

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
  const priceText = f.price.trim().replace(",", ".");
  const price = priceText === "" ? null : Number(priceText);
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

show(!!getToken());
