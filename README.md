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
| `admin.html`, `admin.js` | Admin page at `/admin.html`: sign in, add, edit, delete products |
| `shop.js` | Code shared by the Products and admin pages |
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
