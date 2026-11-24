# A-webPAge

A one-page website for **Gift City Qatar**, a wholesale supplier of advertising items and printing in Old Murrah, Doha.

Plain HTML, CSS and JavaScript. No build step and no frameworks.

## What's on the page

- **Hero** with a cycling product photo card and a "What do you need printed?" box that fills in the quote form
- **Marquee band** of product names that speeds up as you scroll
- **Product tabs** (Gifts and promo, Awards, Print and branding) with real product photos
- **3D product ring** you can drag, with a photo viewer
- **How it works** steps, stats that count up, and an FAQ
- **Quote form** that opens WhatsApp with the message ready
- Light and dark themes, a pause-animations button, and support for reduced motion
- Responsive from phones to wide desktops

## Files

| File | What it holds |
|---|---|
| `index.html` | Page content |
| `style.css` | All styling |
| `script.js` | Home page behavior |
| `config.js` | Contact details, WhatsApp number and Supabase connection. Edit here. |
| `products.html`, `products.js` | Public Products page: filter, details, Buy Now on WhatsApp |
| `admin.html`, `admin.js` | Admin page at `/admin.html`: sign in, add, edit, delete products, or import many from an Excel sheet |
| `xlsx.js` | Reads the first sheet of an uploaded `.xlsx` file in the browser (no library) |
| `shop.js` | Code shared by the Products and admin pages |
| `chat.js` | Floating chat button and window on the Home and Products pages |
| `api/chat.js` | Chat endpoint `/api/chat` (Vercel function): validates, rate-limits, asks Groq, checks the answer |
| `company_knowledge.md` | The only facts the chatbot may use. Fill it in, then redeploy. Never served publicly. |
| `build.js` | Deploy step: copies the site into `public/` and writes `config.js` there |
| `supabase.sql` | Database and photo storage setup, run once |
| `images/` | Cropped product photos |
| `logo.png`, `favicon.png` | Logo and browser-tab icon |


## Products and admin setup (one time)

Products live in a free [Supabase](https://supabase.com) project, so the admin can change them without a developer.

1. Create a Supabase project. In **SQL Editor**, paste and run `supabase.sql`.
2. In **Authentication > Users**, add one user (the admin's email and a strong password). In **Authentication > Sign In / Providers**, turn off **Allow new users to sign up**.
3. In **Project Settings > API**, copy the Project URL and the `anon` public key into `config.js` under `supabase`.
4. Deploy. The admin opens `/admin.html`, signs in, and manages products. They show on `/products.html` at once.

Buy Now opens WhatsApp (the `whatsapp` number in `config.js`) with the product name, type and code filled in.


## Chatbot (one time)

The chat button answers visitors from `company_knowledge.md` only, using [Groq](https://console.groq.com).

1. Fill in `company_knowledge.md`. Text inside `<!-- -->` is ignored. While every section is empty, the bot replies that the information is not available.
2. Create an API key at console.groq.com > API Keys.
3. In Vercel > Project > Settings > Environment Variables, add `GROQ_API_KEY` (the key) and optionally `GROQ_MODEL` (default `llama-3.1-8b-instant`). Redeploy.
4. To run it locally: `npm install`, copy `.env.example` to `.env.local`, add the key, then `vercel dev`. Opening the HTML files directly shows the button, but `/api/chat` needs `vercel dev`.

How it stays on topic: the model must reply in JSON and quote the knowledge file. The server rejects an answer when a quote is not in the file, or when it contains a number or email that is not in the file. Off-topic questions and greetings get fixed replies.

Rate limit: 10 messages a minute and 60 an hour per visitor IP, kept in the function's memory. Vercel runs several copies of a function and restarts them, so this limit is per copy and resets. For a hard limit, use a shared store such as Upstash Redis (Vercel Marketplace) with `@upstash/ratelimit`, and set a spending limit in the Groq console.
