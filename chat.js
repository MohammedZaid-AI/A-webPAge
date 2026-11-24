/* Website chatbot: floating button + chat window. Talks to /api/chat, which answers only from company_knowledge.md. */
(() => {
  const WELCOME = "Hi! I'm the Gift City assistant. Ask me about our company, products and services.";
  const MAX = 1000;   // same limit as api/chat.js
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon = d => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* replies are plain text with optional **bold** and "- " / "1. " lists; everything is escaped first */
  function format(text){
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    const kind = l => /^[-*•] /.test(l) ? "ul" : /^\d+[.)] /.test(l) ? "ol" : "p";
    let html = "";
    for (const block of text.trim().split(/\n\s*\n/)){
      let group = [], type = null;
      const flush = () => {
        if (!group.length) return;
        html += type === "p" ? `<p>${group.map(inline).join("<br>")}</p>`
          : `<${type}>${group.map(l => `<li>${inline(l.replace(/^([-*•]|\d+[.)]) /, ""))}</li>`).join("")}</${type}>`;
        group = [];
      };
      for (const line of block.split("\n").map(l => l.trim()).filter(Boolean)){
        if (kind(line) !== type){ flush(); type = kind(line); }
        group.push(line);
      }
      flush();
    }
    return html;
  }

  document.body.insertAdjacentHTML("beforeend", `
<button class="chat-fab" id="chatFab" type="button" aria-label="Chat with us" aria-expanded="false" aria-controls="chatPanel">
  ${icon("M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z")}
</button>
<section class="chat-panel" id="chatPanel" role="dialog" aria-labelledby="chatTitle" aria-hidden="true" inert>
  <header class="chat-head">
    <div><h2 id="chatTitle">Ask Gift City</h2><p>AI assistant · answers from our company information</p></div>
    <button class="icon-btn" id="chatNew" type="button" aria-label="Start a new conversation" title="New conversation">${icon("M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5")}</button>
    <button class="icon-btn" id="chatClose" type="button" aria-label="Close chat">${icon("M6 6l12 12M18 6L6 18")}</button>
  </header>
  <div class="chat-log" id="chatLog" role="log" aria-live="polite"></div>
  <form class="chat-form" id="chatForm">
    <label class="sr-only" for="chatInput">Your message</label>
    <textarea id="chatInput" rows="1" maxlength="${MAX}" placeholder="Type your question…" autocomplete="off"></textarea>
    <button class="chat-send" type="submit" aria-label="Send">${icon("M5 12h14M13 6l6 6-6 6")}</button>
  </form>
</section>`);

  const $ = id => document.getElementById(id);
  const fab = $("chatFab"), panel = $("chatPanel"), log = $("chatLog"), form = $("chatForm"), input = $("chatInput");
  let history = [], busy = false;

  function bubble(kind, html){
    const el = document.createElement("div");
    el.className = "chat-msg chat-" + kind; el.innerHTML = html;
    log.appendChild(el); log.scrollTop = log.scrollHeight;
    return el;
  }
  function reset(){
    history = []; log.innerHTML = ""; input.value = ""; fit();
    bubble("bot", format(WELCOME));
  }
  function setOpen(open){
    panel.classList.toggle("open", open);
    panel.inert = !open; panel.setAttribute("aria-hidden", String(!open));
    fab.setAttribute("aria-expanded", String(open));
    if (open){ if (!log.children.length) reset(); input.focus(); } else fab.focus();
  }
  const fit = () => {
    input.style.height = "auto";
    const h = input.scrollHeight + 2;   // + borders
    input.style.height = Math.min(h, 120) + "px"; input.style.overflowY = h > 120 ? "auto" : "hidden";
  };

  fab.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
  $("chatClose").addEventListener("click", () => setOpen(false));
  $("chatNew").addEventListener("click", () => { if (!busy){ reset(); input.focus(); } });
  panel.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  input.addEventListener("input", fit);
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); form.requestSubmit(); } });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true; form.classList.add("busy");
    input.value = ""; fit();
    bubble("user", format(text));
    history.push({ role: "user", content: text });
    const wait = bubble("bot chat-wait", '<span></span><span></span><span></span><span class="sr-only">The assistant is typing</span>');
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.slice(-11) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.reply !== "string") throw new Error(data.error || "The assistant could not answer right now. Please try again.");
      wait.remove(); bubble("bot", format(data.reply));
      history.push({ role: "assistant", content: data.reply });
    } catch(err){
      wait.remove(); history.pop();   // a failed question is not part of the conversation, so it can be asked again
      bubble("bot chat-error", esc(err instanceof TypeError ? "Could not reach the assistant. Check your connection and try again." : err.message));
    } finally {
      busy = false; form.classList.remove("busy"); input.focus();
    }
  });
})();
