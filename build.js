/* Vercel build step: copies the site into public/ and writes config.js there from environment variables.
   Only site files are copied, so company_knowledge.md, api/, SQL and notes are never served as static files.
   Locally you keep your own config.js; this only runs on deploy. */
const fs = require("fs");
const path = require("path");
const need = ["SUPABASE_URL", "SUPABASE_KEY", "WHATSAPP", "EMAIL", "PHONES"];
const missing = need.filter(k => !process.env[k]);
if (missing.length) { console.error("Missing environment variables: " + missing.join(", ")); process.exit(1); }
const e = process.env;
const config = {
  phones: e.PHONES.split(",").map(s => s.trim()).filter(Boolean),
  whatsapp: e.WHATSAPP,
  email: e.EMAIL,
  supabase: { url: e.SUPABASE_URL, key: e.SUPABASE_KEY, bucket: "product-images" }
};

const OUT = "public";
const SITE = /\.(html|css|js|png|jpg|jpeg|webp|svg|ico)$/i;
const SKIP = new Set(["build.js", "config.js"]);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const f of fs.readdirSync(".")) if (SITE.test(f) && !SKIP.has(f) && fs.statSync(f).isFile()) fs.copyFileSync(f, path.join(OUT, f));
fs.cpSync("images", path.join(OUT, "images"), { recursive: true, filter: src => !src.includes("posters") });
fs.writeFileSync(path.join(OUT, "config.js"), "const CONFIG = " + JSON.stringify(config, null, 2) + ";\n");
console.log("public/ written with config.js");
