# TradeTracker

A mobile-first job and client tracker for solo tradespeople. Runs entirely in the browser — no server, no login, no nonsense. All data stays on your device.

## What it does

- **Clients** — add and manage your client list (name, phone, email, address)
- **Jobs** — track jobs per client with status (pending / in-progress / done) and price
- **Invoice PDF** — one tap generates a clean PDF invoice and downloads it
- **Settings** — your business name/address/VAT populates every invoice

## Deploy to GitHub Pages (free hosting)

1. Create a new GitHub repo, e.g. `tradesperson-tracker`
2. Push these four files to the `main` branch (root of repo)
   ```
   index.html
   style.css
   app.js
   README.md
   ```
3. Go to repo Settings > Pages > Source: "Deploy from a branch" > Branch: `main`, folder: `/ (root)`
4. Save. GitHub gives you a URL like `https://yourusername.github.io/tradesperson-tracker/`
5. Bookmark it on your phone. Add to home screen for an app-like experience.

**That's it.** No build step, no npm, nothing to install.

## Plug in your real Stripe link

In `index.html` and `app.js`, replace every instance of:
```
https://buy.stripe.com/PLACEHOLDER
```
with your actual Stripe Payment Link URL, e.g.:
```
https://buy.stripe.com/abc123xyz
```

To create a Payment Link in Stripe:
1. Stripe Dashboard > Payment Links > Create
2. Add a product: "TradeTracker Pro" — recurring, £12/month
3. Copy the link
4. Paste it in to replace the placeholder (two spots: `index.html` and `app.js`)

## Invoice PDF

The invoice uses [jsPDF](https://github.com/parallax/jsPDF) loaded from a CDN. It works offline once the page has loaded once (browser caches it).

Each invoice includes:
- Your business details (from Settings)
- Client name and address
- Job description and price
- VAT calculation if you have a VAT number set
- Payment terms (14 days)

First 3 invoices are free. After that the app shows a subscribe prompt.

## Data

Everything is stored in `localStorage` on the device. There's no sync across devices. If you clear browser data, you lose everything — export important stuff to PDF first.

## Local dev (if you want to tweak it)

No build step needed. Just open `index.html` in Chrome. Or run a quick local server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Tech

- Pure HTML/CSS/JS — no framework
- jsPDF 2.5.1 (CDN)
- Stripe via Payment Link redirect (no server-side keys)
- localStorage for persistence
