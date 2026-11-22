/* ===== Client details: change these once the client sends the real ones ===== */
const CONFIG = {
  phones:   ["+974 6633 4429", "+974 3371 8277", "+974 5032 8433"],
  whatsapp: "+974 6633 4429",   // the number the quote form sends to
  email:    "giftcity.advertising@gmail.com"
};

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
};

/* ----- contact details ----- */
const digits = n => n.replace(/[^\d+]/g, "");
$("#phoneList").innerHTML = CONFIG.phones.map(p => `<a href="tel:${digits(p)}">${p}</a>`).join("<br>");

/* ----- mobile menu ----- */
const nav = $(".nav"), menuBtn = $("#menuBtn");
menuBtn.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
});
$$("#links a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }));
$("#waLink").textContent = CONFIG.whatsapp;  $("#waLink").href = "https://wa.me/" + digits(CONFIG.whatsapp).replace("+", "");
$("#mailLink").textContent = CONFIG.email;   $("#mailLink").href = "mailto:" + CONFIG.email;

/* ----- theme + pause ----- */
const themeBtn = $("#themeBtn"), pauseBtn = $("#pauseBtn");
function setTheme(t){
  root.dataset.theme = t;
  themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  store.set("gc-theme", t);
}
setTheme(store.get("gc-theme") || "dark");
themeBtn.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));

function setStill(on){
  root.classList.toggle("still", on);
  pauseBtn.setAttribute("aria-pressed", on);
  pauseBtn.setAttribute("aria-label", on ? "Play animations" : "Pause animations");
  store.set("gc-still", on ? "1" : "0");
}
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
setStill(reduced || store.get("gc-still") === "1");
pauseBtn.addEventListener("click", () => setStill(!root.classList.contains("still")));

/* ----- scroll reveals ----- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: .15, rootMargin: "0px 0px -6% 0px" });
/* reveals start after the preloader opens, so the hero animates in view */
let revealsStarted = false;
function startReveals(){
  if (revealsStarted) return; revealsStarted = true;
  $$(".reveal").forEach(el => io.observe(el));
}

/* ----- nav underline follows the current section ----- */
const links = $$("#links a"), line = $(".links-line");
function moveLine(a){
  if (!a) { line.style.width = "0"; return; }
  line.style.width = a.offsetWidth - 24 + "px";
  line.style.transform = `translateX(${a.offsetLeft + 12}px)`;
  links.forEach(l => l.classList.toggle("on", l === a));
}
const secs = links.map(a => $("#" + a.dataset.sec));
function onScroll(){
  const y = scrollY + innerHeight * .35;
  let cur = null;
  secs.forEach((s, i) => { if (s.offsetTop <= y) cur = links[i]; });
  if (cur !== onScroll.last){ onScroll.last = cur; moveLine(cur); }
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", () => moveLine(onScroll.last));
onScroll();

/* ----- blur highlight: words blur in, key phrases get underlined ----- */
(function(){
  const el = $("#bh"); let idx = 0;
  (function walk(node, mark){
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3){
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.append(" "); return; }
          const s = document.createElement("span");
          s.className = "w"; s.style.setProperty("--i", idx++); s.textContent = t;
          frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeName === "MARK"){
        walk(n, true);
        n.style.setProperty("--end", idx);
      }
    });
  })(el);
  new IntersectionObserver(([e], o) => {
    if (e.isIntersecting){ el.classList.add("in"); o.disconnect(); }
  }, { threshold: .5 }).observe(el);
})();


/* ----- hero photo card: the client's product photos cross-fade ----- */
(function(){
  const box = $("#scPhotos"), cat = $("#scCat"), num = $("#scNum");
  const slides = [
    ["Ceramic mugs","Gifts","ceramic-mugs"],["Executive awards","Awards","executive-awards"],
    ["Metallic pens","Gifts","metallic-pens"],["Vehicle branding","Branding","vehicle-branding"],
    ["Medals","Awards","medals"],["Gift sets","Gifts","gift-sets"],
    ["Travel mugs","Gifts","travel-mugs"],["Notebook gift sets","Gifts","notebook-gift-set"]
  ];
  box.innerHTML = slides.map(([n, , f], i) => `<img src="images/${f}.jpg" alt="${n}" ${i ? 'loading="lazy"' : ""} decoding="async">`).join("");
  const imgs = $$("img", box);
  let i = 0;
  function show(k){
    imgs.forEach((im, j) => im.classList.toggle("on", j === k));
    cat.textContent = `${slides[k][1]} / ${slides[k][0]}`;
    num.textContent = `Item ${String(k + 1).padStart(2, "0")}`;
  }
  show(0);
  setInterval(() => {
    if (root.classList.contains("still") || document.hidden) return;
    i = (i + 1) % slides.length; show(i);
  }, 4200);
})();

/* ----- text scatter: headline letters near the pointer fly apart, then spring back ----- */
(function(){
  const h1 = $(".hero2 h1"); if (!h1) return;
  h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, " ").trim());
  const letters = [];
  $$(".h1-line", h1).forEach(line => {
    line.setAttribute("aria-hidden", "true");
    const words = line.textContent.split(" ");
    line.textContent = "";
    words.forEach((w, wi) => {
      const word = document.createElement("span");
      word.className = "ts-word";
      [...w].forEach(ch => {
        const s = document.createElement("span");
        s.className = "ts-ch"; s.textContent = ch;
        word.append(s);
        letters.push({ el: s, x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, tx: 0, ty: 0, tr: 0, spin: Math.random() < .5 ? -1 : 1 });
      });
      line.append(word);
      if (wi < words.length - 1) line.append(" ");
    });
  });
  const RADIUS = 130, PUSH = 70, TURN = 28;
  let px = -1e4, py = -1e4, running = false, inside = false;
  function aim(){
    const box = h1.getBoundingClientRect();
    letters.forEach(L => {
      const cx = box.left + L.el.offsetLeft + L.el.offsetWidth / 2;   /* layout position: ignores the scatter itself */
      const cy = box.top + L.el.offsetTop + L.el.offsetHeight / 2;
      const dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy) || 1;
      if (inside && d < RADIUS){
        const f = 1 - d / RADIUS;
        L.tx = dx / d * f * PUSH; L.ty = dy / d * f * PUSH - f * 12; L.tr = L.spin * f * TURN;
      } else { L.tx = L.ty = L.tr = 0; }
    });
  }
  function step(){
    let moving = false;
    letters.forEach(L => {
      L.vx = (L.vx + (L.tx - L.x) * .14) * .78; L.x += L.vx;
      L.vy = (L.vy + (L.ty - L.y) * .14) * .78; L.y += L.vy;
      L.vr = (L.vr + (L.tr - L.r) * .14) * .78; L.r += L.vr;
      if (Math.abs(L.vx) + Math.abs(L.vy) + Math.abs(L.vr) > .02 || Math.abs(L.x) + Math.abs(L.y) > .05) moving = true;
      L.el.style.transform = (Math.abs(L.x) + Math.abs(L.y) + Math.abs(L.r) < .01) ? "" : `translate(${L.x.toFixed(2)}px, ${L.y.toFixed(2)}px) rotate(${L.r.toFixed(2)}deg)`;
    });
    if (moving || inside) requestAnimationFrame(step);
    else {                                                   /* settled: snap exactly home */
      running = false;
      letters.forEach(L => { L.x = L.y = L.r = L.vx = L.vy = L.vr = 0; L.el.style.transform = ""; });
    }
  }
  function kick(){ if (!running){ running = true; requestAnimationFrame(step); } }
  h1.addEventListener("pointermove", e => {
    if (root.classList.contains("still")) return;
    inside = true; px = e.clientX; py = e.clientY; aim(); kick();
  });
  h1.addEventListener("pointerleave", () => { inside = false; aim(); kick(); });   /* everything falls back into place */
})();

/* ----- hero question box: carries what they typed into the quote form ----- */
$("#heroAsk").addEventListener("submit", e => {
  e.preventDefault();
  const need = $("#heroNeed").value.trim();
  const form = $("#quote"), sel = $("#itemSelect");
  if (need){
    form.elements.msg.value = need;
    const hit = [...sel.options].find(o => need.toLowerCase().includes(o.text.toLowerCase().replace(/s$/, "")) || o.text.toLowerCase().includes(need.toLowerCase()));
    sel.value = hit ? hit.value : "Something else";
  }
  $("#contact").scrollIntoView({ behavior: root.classList.contains("still") ? "auto" : "smooth" });
  setTimeout(() => form.elements.name.focus({ preventScroll: true }), 600);
});

/* ----- products ----- */
const ICONS = {
  pen:'<path d="M8 40l4-12 22-22 8 8-22 22z"/><path d="M30 10l8 8"/>',
  mug:'<path d="M10 14h26v18a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z"/><path d="M36 20h4a5 5 0 0 1 0 10h-4"/>',
  bottle:'<path d="M19 6h10v6l3 4v26H16V16l3-4z"/><path d="M16 24h16"/>',
  usb:'<rect x="14" y="16" width="20" height="26" rx="3"/><path d="M19 16V6h10v10M21 10v2M27 10v2"/>',
  pillow:'<path d="M6 12c10 3 26 3 36 0 3 8 3 16 0 24-10-3-26-3-36 0-3-8-3-16 0-24z"/>',
  shirt:'<path d="M16 6l-10 6 5 8 5-3v25h16V17l5 3 5-8-10-6c-1 4-4 6-8 6s-7-2-8-6z"/>',
  vest:'<path d="M14 6l6 8 4-4 4 4 6-8 4 8v28H10V14z"/><path d="M24 14v28M10 30h28"/>',
  pad:'<rect x="6" y="12" width="36" height="26" rx="5"/><circle cx="24" cy="25" r="5"/>',
  trophy:'<path d="M15 6h18v14a9 9 0 0 1-18 0z"/><path d="M15 10H8c0 8 3 11 8 12M33 10h7c0 8-3 11-8 12M24 29v8M16 42h16"/>',
  plaque:'<path d="M10 8h28l4 8v26H6V16z"/><path d="M14 26h20M14 33h12"/>',
  photo:'<rect x="6" y="9" width="36" height="30" rx="4"/><circle cx="17" cy="20" r="3.5"/><path d="M6 34l11-9 8 7 7-5 10 8"/>',
  card:'<rect x="5" y="11" width="38" height="26" rx="4"/><path d="M11 20h12M11 26h18"/>',
  bag:'<path d="M9 16h30l2 26H7z"/><path d="M17 20v-6a7 7 0 0 1 14 0v6"/>',
  banner:'<path d="M12 6h24v32H12zM6 42h36M24 38v4"/><path d="M18 14h12M18 20h12"/>',
  sticker:'<path d="M8 8h32v22l-10 10H8z"/><path d="M30 40V30h10"/>',
  lanyard:'<path d="M14 4l10 18 10-18"/><rect x="16" y="26" width="16" height="16" rx="3"/>',
  box:'<path d="M6 16l18-8 18 8v22l-18 8-18-8z"/><path d="M6 16l18 8 18-8M24 24v22"/>',
  cup:'<path d="M10 10h28l-4 32H14z"/><path d="M11 18h26"/>',
  pin:'<ellipse cx="24" cy="22" rx="17" ry="12"/><path d="M24 34v8M18 22h12"/>',
  car:'<path d="M5 30l4-11h24l8 7h3v9H5z"/><circle cx="14" cy="35" r="4"/><circle cx="35" cy="35" r="4"/><path d="M13 19v7h20"/>',
  laser:'<rect x="8" y="10" width="32" height="28" rx="4"/><path d="M24 14v12M18 30h12"/><circle cx="24" cy="28" r="2"/>'
};
/* [name, icon, note, photo in images/ (optional)] */
const ALL_GROUPS = {
  gifts: [
    ["Ceramic mugs","mug","Metallic, gradient and full-color print","ceramic-mugs"],
    ["Metallic pens","pen","Bold colors, printed with your logo","metallic-pens"],
    ["Paper cups","cup","Your brand on every cup","paper-cups"],
    ["Gift sets","box","Boxed bottle, card and pen sets","gift-sets"],
    ["Travel mugs and bottles","bottle","Insulated drinkware with your logo","travel-mugs"],
    ["Notebook gift sets","card","PU leather notebook and pen, with a metal name plate","notebook-gift-set"],
    ["Magic mirror photo frames","photo","Your photo lights up in the mirror, USB powered","magic-mirror-frame"],
    ["Wooden award plaques","plaque","Engraved with your logo, in a presentation box","wooden-plaque"],
    ["USB drives","usb","Branded for events and clients"],
    ["Pillows","pillow","Printed with photo or artwork"],
    ["T-shirts","shirt","Staff, team and event wear"],
    ["Safety vests","vest","High-visibility, with your logo"],
    ["Mouse pads","pad","Custom full-color print"]
  ],
  awards: [
    ["Executive awards","trophy","Star trophies for corporate, sports and academic wins","executive-awards"],
    ["Championship trophies","trophy","Classic gold cups with ribbons","championship-trophy"],
    ["Lapel pins","pin","Custom designs with a premium finish","lapel-pins"],
    ["Medals","trophy","Gold, silver and bronze on ribbons, made to order","medals"],
    ["Acrylic mementos","plaque","Clear and colored, printed or etched"],
    ["Crystal awards","plaque","For ceremonies and long service"],
    ["Rock photo frames","photo","Photo printed on stone"]
  ],
  print: [
    ["Vehicle branding","car","Car wraps, truck graphics and decals","vehicle-branding"],
    ["Laser engraving","laser","Permanent marking on metal and crystal","laser-engraving"],
    ["Lanyards and badges","lanyard","Printed or plain, for ID cards and events","lanyards"],
    ["Magnetic name badges","pin","Reusable magnetic backs, no pin holes","magnetic-badges"],
    ["Gift boxes","box","Custom rigid boxes for every occasion","gift-boxes"],
    ["Business cards","card","Many paper and finish options"],
    ["Paper bags","bag","Printed shopping and gift bags"],
    ["Banners and roll-ups","banner","Indoor and outdoor, any size"],
    ["Stickers","sticker","Cut to shape, any quantity"]
  ]
};
/* the product cards show only items that have a real photo; the rest stay in the quote form's list */
const GROUPS = Object.fromEntries(Object.entries(ALL_GROUPS).map(([g, items]) => [g, items.filter(it => it[3])]));
const grid = $("#grid");
function renderGroup(g){
  grid.innerHTML = GROUPS[g].map(([name, ic, note, photo], i) =>
    `<button class="item" type="button" style="--i:${i}" data-name="${name}">
       <span class="item-media">${photo
         ? `<img src="images/${photo}.jpg" alt="" loading="lazy" decoding="async">`
         : `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[ic]}</svg>`}</span>
       <span class="item-body"><h3>${name}</h3><span>${note}</span></span></button>`).join("");
}
const pill = $("#pill"), thumb = $(".pill-thumb", pill), tabs = $$("button", pill);
function moveThumb(btn){
  thumb.style.width = btn.offsetWidth + "px";
  thumb.style.height = btn.offsetHeight + "px";
  thumb.style.bottom = "auto";
  thumb.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop - 5}px)`;
}
tabs.forEach(b => b.addEventListener("click", () => {
  tabs.forEach(t => t.setAttribute("aria-selected", t === b));
  moveThumb(b); renderGroup(b.dataset.group);
}));
renderGroup("gifts");
const firstTab = () => tabs.find(t => t.getAttribute("aria-selected") === "true");
requestAnimationFrame(() => moveThumb(firstTab()));
addEventListener("resize", () => moveThumb(firstTab()));
document.fonts && document.fonts.ready.then(() => moveThumb(firstTab()));

/* clicking a product pre-selects it in the quote form */
const select = $("#itemSelect");
const all = Object.values(ALL_GROUPS).flat().map(x => x[0]);
select.innerHTML = all.map(n => `<option>${n}</option>`).join("") + "<option>Something else</option>";
grid.addEventListener("click", e => {
  const it = e.target.closest(".item"); if (!it) return;
  select.value = it.dataset.name;
  $("#contact").scrollIntoView({ behavior: root.classList.contains("still") ? "auto" : "smooth" });
});

/* ----- rotating cards: draggable 3D ring ----- */
(function(){
  const stage = $("#ringStage"), ring = $("#ring");
  const picks = [["Ceramic mugs","ceramic-mugs"],["Executive awards","executive-awards"],["Metallic pens","metallic-pens"],["Vehicle branding","vehicle-branding"],["Gift sets","gift-sets"],["Travel mugs","travel-mugs"],["Notebook gift sets","notebook-gift-set"],["Medals","medals"],["Wooden plaques","wooden-plaque"],["Lapel pins","lapel-pins"],["Magic mirror frames","magic-mirror-frame"],["Gift boxes","gift-boxes"],["Magnetic name badges","magnetic-badges"],["Championship trophies","championship-trophy"],["Paper cups","paper-cups"],["Laser engraving","laser-engraving"],["Lanyards","lanyards"]];
  const N = picks.length, step = 360 / N;
  ring.innerHTML = picks.map(([n, f], i) =>
    `<div class="rc rc-photo" style="--a:${i * step}deg" data-i="${i}">
       <img src="images/${f}.jpg" alt="${n}" loading="lazy" decoding="async" draggable="false">
       <div class="rc-cap"><h3>${n}</h3></div></div>`).join("");
  const cards = $$(".rc", ring);
  let angle = 0, vel = 0, down = false, lastX = 0, lastT = 0, startX = 0;

  /* lightbox: click a card to see the photo large */
  const lb = $("#lb"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
  function openLb(i){
    const [n, f] = picks[i];
    lbImg.src = `images/${f}.jpg`; lbImg.alt = n; lbCap.textContent = n;
    lb.showModal();
  }
  $("#lbClose").addEventListener("click", () => lb.close());
  lb.addEventListener("click", e => { if (e.target === lb) lb.close(); });
  $("#lbQuote").addEventListener("click", () => {
    lb.close();
    const sel = $("#itemSelect"), opt = [...sel.options].find(o => o.text === lbCap.textContent || o.text.startsWith(lbCap.textContent));
    if (opt) sel.value = opt.value;
  });
  const still = () => root.classList.contains("still");
  /* ring radius follows the number of cards and the card width, so cards never overlap however many there are */
  function setR(){
    const cw = parseFloat(getComputedStyle(stage).getPropertyValue("--cw")) || 240;
    stage.style.setProperty("--R", Math.round(cw / (2 * Math.tan(Math.PI / N)) * 1.06) + "px");
  }
  setR(); addEventListener("resize", setR);
  function R(){ return parseFloat(getComputedStyle(stage).getPropertyValue("--R")); }
  function draw(){
    ring.style.transform = `translateZ(${-R()}px) rotateY(${angle}deg)`;
    cards.forEach((c, i) => {
      const a = ((i * step + angle) % 360 + 360) % 360;
      const front = (Math.cos(a * Math.PI / 180) + 1) / 2;   /* 1 facing us, 0 behind */
      c.style.opacity = (.25 + .75 * front).toFixed(2);
      c.style.filter = `blur(${((1 - front) * 2.5).toFixed(1)}px)`;
    });
  }
  function tick(){
    if (!down){
      if (Math.abs(vel) > .02) { angle += vel; vel *= .94; }
      else if (!still() && !stage.matches(":hover")) angle += .12;
    }
    draw(); requestAnimationFrame(tick);
  }
  stage.addEventListener("pointerdown", e => { down = true; startX = lastX = e.clientX; lastT = performance.now(); vel = 0; stage.classList.add("drag"); stage.setPointerCapture(e.pointerId); });
  stage.addEventListener("pointermove", e => {
    if (!down) return;
    const now = performance.now(), dx = e.clientX - lastX;
    angle += dx * .35; vel = dx * .35 / Math.max(1, now - lastT) * 16;
    lastX = e.clientX; lastT = now;
  });
  const up = e => {
    down = false; stage.classList.remove("drag");
    if (e.type === "pointerup" && Math.abs(e.clientX - startX) < 6){   /* a tap, not a drag */
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const card = hit && hit.closest(".rc");
      if (card) openLb(+card.dataset.i);
    }
  };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
  const snap = dir => { angle = Math.round(angle / step) * step + dir * step; vel = 0; };
  $("#ringPrev").addEventListener("click", () => snap(1));
  $("#ringNext").addEventListener("click", () => snap(-1));
  stage.tabIndex = 0;
  stage.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") snap(1);
    if (e.key === "ArrowRight") snap(-1);
    if (e.key === "Enter") openLb(((Math.round(-angle / step) % N) + N) % N);   /* the card facing you */
  });
  requestAnimationFrame(tick);
})();

/* ----- printing tags ----- */
$("#tags").innerHTML = ["Business cards","Letterheads","Flyers","Brochures","Envelopes","NCR vouchers","Wedding cards","ID cards","Name badges","Lanyards","Mouse pads","Key chains","Shopping bags","Tissue boxes","Banners and roll-ups","Flex signage","Stickers","Acrylic signs"]
  .map(t => `<li>${t}</li>`).join("");

/* ----- process steps light up in order ----- */
const steps = $("#steps");
new IntersectionObserver(([e], o) => {
  if (!e.isIntersecting) return;
  steps.classList.add("run");
  const lis = $$("li", steps);
  lis.forEach((li, i) => setTimeout(() => {
    lis.forEach(l => l.classList.remove("current"));
    li.classList.add("in", "current");                        /* where the sequence is now, in red */
    if (i === lis.length - 1) setTimeout(() => li.classList.remove("current"), 1400);   /* all done */
  }, i * 650));
  o.disconnect();
}, { threshold: .4 }).observe(steps);

/* ----- marquee band: drifts on its own, scrolling pushes it along ----- */
(function(){
  const rows = $$(".mq").map(el => {
    const track = $(".mq-track", el), first = $(".mq-words", el);
    return { el, track, first, back: el.classList.contains("mq-back"), speed: +el.dataset.speed || 35, o: 0, period: 1 };
  });
  const pauseBtn = $("#mqPause");
  let paused = false, lastY = scrollY, last = 0, push = 0;
  function fill(){
    rows.forEach(r => {
      $$(".mq-words", r.track).slice(1).forEach(n => n.remove());
      r.period = r.first.offsetWidth || 1;
      const copies = Math.ceil(r.el.offsetWidth / r.period) + 1;
      for (let i = 0; i < copies; i++){
        const c = r.first.cloneNode(true); c.setAttribute("aria-hidden", "true"); r.track.append(c);
      }
    });
  }
  function frame(now){
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    const dy = scrollY - lastY; lastY = scrollY;
    push += (Math.abs(dy) * 1.2 - push) * .15;               /* scrolling speeds the band up */
    const still = root.classList.contains("still");
    rows.forEach(r => {
      if (!still && !paused) r.o = (r.o + (r.speed + push * 18) * dt) % r.period;
      const x = r.back ? r.o - r.period : -r.o;               /* the second row runs the other way */
      r.track.style.transform = `translateX(${x}px)`;
    });
    requestAnimationFrame(frame);
  }
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "play" : "pause";
    pauseBtn.setAttribute("aria-pressed", paused);
  });
  fill();
  addEventListener("resize", fill);
  document.fonts && document.fonts.ready.then(fill);
  requestAnimationFrame(frame);
})();

/* ----- stats count up when they arrive ----- */
(function(){
  const stats = $("#stats"); if (!stats) return;
  const figs = $$(".stat-fig", stats);
  /* the product count always matches the product cards */
  const total = Object.values(ALL_GROUPS).flat().length;
  figs[0].dataset.to = total; figs[0].textContent = total;
  const fmt = n => n.toLocaleString("en-US");
  if (!root.classList.contains("still")) figs.forEach(f => f.textContent = "0");
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return; o.disconnect();
    if (root.classList.contains("still")) return;
    const t0 = performance.now(), dur = 1600;
    (function tick(now){
      const p = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - p, 4);
      figs.forEach(f => f.textContent = fmt(Math.round(+f.dataset.to * ease)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }, { threshold: .5 }).observe(stats);
})();

/* ----- preloader ----- */
(function(){
  const pre = $("#pre"), bar = $("#preBar"), pct = $("#prePct");
  let p = 0, loaded = document.readyState === "complete", finished = false;
  const t0 = performance.now(), MIN = root.classList.contains("still") ? 0 : 1500;
  addEventListener("load", () => loaded = true);
  function finish(){
    if (finished) return; finished = true;
    bar.style.strokeDashoffset = 0; pct.textContent = "100%";
    pre.classList.add("done");
    root.classList.remove("loading");
    startReveals();
    setTimeout(() => pre.remove(), 1100);
  }
  function frame(now){
    if (finished) return;
    const t = Math.min(1, (now - t0) / MIN || 1);
    const target = loaded ? 100 : 90;                     /* wait at 90% until everything has loaded */
    p += (Math.min(target, t * 100) - p) * .12;
    const shown = Math.round(p);
    bar.style.strokeDashoffset = 289 * (1 - p / 100);
    pct.textContent = shown + "%";
    if (loaded && t >= 1 && p > 99) return finish();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setTimeout(finish, 6000);                               /* failsafe: never trap the visitor */
})();

/* ----- quote form: opens WhatsApp with the message ready ----- */
$("#quote").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target), status = $("#status");
  if (!f.get("name").trim()){ status.textContent = "Enter your name so we know who to reply to."; return; }
  if (/0000 0000/.test(CONFIG.whatsapp)){ status.textContent = "The shop's WhatsApp number isn't set yet. Add it in CONFIG at the top of the script."; return; }
  const text = `Hello Gift City, I'm ${f.get("name").trim()}.\nI need: ${f.get("item")}\nQuantity: ${f.get("qty") || "not sure yet"}\n${f.get("msg") || ""}`.trim();
  status.textContent = "Opening WhatsApp with your message.";
  open("https://wa.me/" + digits(CONFIG.whatsapp).replace("+", "") + "?text=" + encodeURIComponent(text), "_blank", "noopener");
});
