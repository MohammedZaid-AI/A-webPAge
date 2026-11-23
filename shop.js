/* Shared by products.html and admin.html: theme, menu, Supabase calls, WhatsApp link */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const digits = n => n.replace(/[^\d+]/g, "");

/* theme (same saved choice as the home page) */
const themeBtn = $("#themeBtn");
function setTheme(t){
  root.dataset.theme = t;
  if (themeBtn) themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  store.set("gc-theme", t);
}
setTheme(store.get("gc-theme") || "dark");
if (themeBtn) themeBtn.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));

/* phone menu */
const nav = $(".nav"), menuBtn = $("#menuBtn");
if (menuBtn) menuBtn.addEventListener("click", () => menuBtn.setAttribute("aria-expanded", nav.classList.toggle("open")));

/* Supabase over plain fetch: PostgREST for rows, Storage for photos, GoTrue for the admin login */
const SB = CONFIG.supabase;
const photoUrl = path => path ? `${SB.url}/storage/v1/object/public/${SB.bucket}/${path}` : "";
async function sb(path, { method = "GET", body, token, headers = {}, file } = {}){
  if (!SB.url || !SB.key) throw new Error("Products are not connected yet. Add the Supabase details in config.js.");
  const res = await fetch(SB.url + path, {
    method,
    headers: { apikey: SB.key, Authorization: `Bearer ${token || SB.key}`,
      ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: file || (body ? JSON.stringify(body) : undefined)
  });
  if (!res.ok){
    const e = await res.json().catch(() => ({}));
    const err = new Error(e.message || e.msg || e.error_description || res.statusText);
    err.status = res.status; err.code = e.code; throw err;
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}
const listProducts = () => sb("/rest/v1/products?select=*&order=created_at.desc");

const money = p => p == null ? "Ask for price" : "QAR " + Number(p).toLocaleString("en-US", { maximumFractionDigits: 2 });
function buyUrl(p){
  const msg = `Hello, I am interested in purchasing the following product:\n\nProduct Name: ${p.name}\nProduct Type: ${p.category}\nProduct Code: ${p.code}\n\nPlease share more details regarding the price and availability.`;
  return "https://wa.me/" + digits(CONFIG.whatsapp).replace("+", "") + "?text=" + encodeURIComponent(msg);
}
