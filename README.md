# Build Daggett Montessori Right

A one-page static advocacy site, organized by the Daggett Montessori PTA, asking Fort Worth ISD to pause the Daggett Montessori (K-8) renovation contract until a comprehensive K-8 Montessori plan is developed, with a petition that saves signatures to a Google Sheet. It uses plain HTML, CSS, and JavaScript, with no framework, no build step, and no database.

```
index.html          The site (all content lives here)
styles.css          Styles (colors are CSS variables at the top)
main.js             Behavior + CONFIG (SCRIPT_URL, CONTACT_EMAIL at the top)
flyer.html          Printable 8.5x11 flyer with the QR code
apps-script/Code.gs Google Apps Script that stores signatures in your Sheet
scripts/make-qr.js  Generates the QR code and sets your domain in the meta tags
public/             QR code output (qr-sign.png, qr-sign.svg)
images/             site-plan(-full).jpg (Sheet AS1.1), phasing-plan(-full).jpg (Sheet G1.2), og-image.jpg, coalition-banner.jpg, dmsicon.jpg (PTA logo) + favicon/apple-touch-icon/header sizes made from it
vercel.json         Tells Vercel to serve the repo root as-is (see note below)
.vercelignore       Keeps scripts/, apps-script/, etc. out of the deployment
```

---

## 1. Preview locally

Any static server works. Use a server rather than opening the file directly, because the petition `fetch` won't work from `file://`.

```bash
npm run preview          # serves at http://localhost:3000
# or
npx serve .
# or
python -m http.server 3000
```

Test the direct link: open `http://localhost:3000/#sign`. The page should land on the **Sign the Petition** heading, just below the sticky header.

---

## 2. Google Sheet setup (stores the signatures)

1. Go to [sheets.google.com](https://sheets.google.com) and create a blank spreadsheet. Name it something like *Daggett Petition Signatures*. Keep it private. Don't share it publicly.
2. In the Sheet, open **Extensions → Apps Script**.
3. Delete the sample code in `Code.gs`, paste the full contents of [`apps-script/Code.gs`](apps-script/Code.gs), and click **Save**.
4. *(Optional but recommended)* Select the `setup` function in the toolbar dropdown and click **Run**. This creates the `Signatures` tab with headers and walks you through the Google permission prompt. If you see "Google hasn't verified this app", click **Advanced → Go to (project name)**. It's your own script.
5. Click **Deploy → New deployment**.
   - Click the gear icon next to *Select type* and choose **Web app**.
   - **Description:** `Petition v1`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
   - Click **Deploy** and authorize if asked.
6. Copy the **Web app URL**. It ends in `/exec`.
7. Paste it into `main.js`:
   ```js
   const SCRIPT_URL = 'https://script.google.com/macros/s/AKfy.../exec';
   ```
8. Test it: open the URL in your browser. You should see `{"count":0}`. Then sign the petition on your local preview and confirm a row appears in the Sheet.

**If you edit `Code.gs` later**, go to **Deploy → Manage deployments → (pencil) Edit → Version: New version → Deploy**. This keeps the same URL. Creating a *new* deployment instead gives you a new URL that you'd have to paste into `main.js` again.

**How it stays private:** `doGet` returns only `{count: N}`. Names, emails, and addresses never leave the Sheet. The site never displays any of them.

**Spam protection:** a hidden honeypot field (checked in the browser and in `Code.gs`), a minimum time before submitting, a disabled submit button after the first click, server-side length limits, and protection against spreadsheet formula injection. Check the Sheet now and then and delete any junk rows. The count updates within about a minute.

> **About `no-cors`:** Apps Script doesn't send CORS headers on POST, so the site submits with `mode: 'no-cors'` and can't read the reply. A successful network request is treated as success, and a network failure shows an error with your contact email. The live count (a GET) does read the JSON normally.

---

## 3. Deploy to Vercel

### Why there's a `vercel.json`

When a project has a `public/` folder and no framework, Vercel serves **only** `public/` by default. That would hide `index.html`. `vercel.json` sets `outputDirectory: "."` so the whole repo root is served, and turns off install and build steps. It also adds a few security and cache headers.

### Option A: Import from GitHub

1. Create a new GitHub repository and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and **Import** the repository.
3. **Framework Preset:** *Other*. Leave the build and output settings blank; `vercel.json` handles them.
4. Click **Deploy**. Every later `git push` to `main` redeploys automatically.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel            # first run: links/creates the project, makes a preview deployment
vercel --prod     # deploy to production
```

### Custom domain (optional)

In Vercel, open **Project → Settings → Domains**, add your domain, and follow the DNS instructions.

---

## 4. QR code + social links (run after you know the final URL)

Once you have the final address (the `*.vercel.app` URL or your custom domain):

```bash
npm install                                   # first time only
npm run qr -- https://your-domain.org
```

This will:

- write `public/qr-sign.png` (1200×1200) and `public/qr-sign.svg`, both pointing to `https://your-domain.org/#sign`
- update `index.html` (canonical, `og:url`, `og:image`, `twitter:image`) to use your domain
- update the URL printed on `flyer.html`

Then commit and redeploy. **If you change domains, run it again**, then reprint any flyers.

Before printing, scan the QR code with your phone to confirm it opens the petition. Use the SVG version (which the flyer already uses) for the sharpest print. The PNG is for slides, social posts, and emails.

**Printing the flyer:** open `https://your-domain.org/flyer.html`, click **Print flyer**, and choose Letter, 100% scale, with background graphics turned on.

---

## 5. Where to edit content

| What | Where |
|---|---|
| Headline, summary, all section text | `index.html`. Each section is marked with a `<!-- ===== NAME ===== -->` comment |
| Petition statement | `index.html`, the `petition-text` block in `#sign` |
| Source document links | `index.html`, `#sources` → `source-list` |
| "Last updated" date | `index.html`: in `#sources` **and** in the footer disclaimer |
| Organizer name, contact email | `index.html` footer **and** `CONTACT_EMAIL` in `main.js` |
| Petition backend URL | `SCRIPT_URL` in `main.js` |
| Plan sheets | `images/site-plan.jpg` / `site-plan-full.jpg` are Sheet AS1.1 (as revised in Addendum 2). `images/phasing-plan.jpg` / `phasing-plan-full.jpg` are Sheet G1.2. Each sheet has a 1600px preview and a 3600px full-size version, rendered from the FWISD Plan Room viewer. Keep DLR Group's title block and copyright notice on them, and keep the credit in the caption. If a later addendum revises a sheet, replace both files. |
| Numbered markers on the site plan | In `#plan`, each `.plan-marker` has `--x`/`--y` (percent from the left/top of the sheet). Update them if you replace the sheet. |
| Social preview image | `images/og-image.jpg` (1200×630) |
| Flyer text | `flyer.html` |
| Colors | CSS variables at the top of `styles.css` |

Search the project for **`TODO`** to find every spot to check before launch.

---

## Pre-launch checklist

- [ ] Deploy the Apps Script and set `SCRIPT_URL` in `main.js`; submit a test signature, then delete the test row
- [x] Set the real contact email (footer + `CONTACT_EMAIL`)
- [ ] Confirm the organizer line in the footer and on the flyer
- [ ] Replace the placeholder source links with exact document URLs
- [ ] Review the headline, concerns, petition wording, and privacy note (all marked `TODO`)
- [ ] Confirm the "Last updated" date (two places)
- [ ] Deploy, then run `npm run qr -- https://<final-domain>`, commit, and redeploy
- [ ] Scan the printed QR code with a phone before mass printing
- [ ] Paste the URL into a text message to check the link preview
