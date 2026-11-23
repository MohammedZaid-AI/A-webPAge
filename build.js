/* Vercel build step: writes config.js from environment variables.
   Locally you keep your own config.js; this only runs on deploy. */
const fs = require("fs");
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
fs.writeFileSync("config.js", "const CONFIG = " + JSON.stringify(config, null, 2) + ";\n");
console.log("config.js written");
