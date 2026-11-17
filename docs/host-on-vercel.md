# Host dragonfirecodex.com on Vercel (free)

Use this when Cursor’s `*.apps.grok.bot` URL cannot use your own domain. **Vercel Hobby is $0**; you only pay for the domain in Cloudflare.

## 1. Fix “The request could not be routed”

That error means DNS points at **Cursor’s host**, but **dragonfirecodex.com is not registered there**.

In **Cloudflare → dragonfirecodex.com → DNS → Records**:

1. **Delete** any CNAME/A record you added for Cursor / `apps.grok.bot` / an unknown target.
2. Leave the domain on Cloudflare until step 4 (Vercel will tell you what to add).

Redirects to `dragonfire-pit.apps.grok.bot` are optional later; they do **not** replace real hosting for AdSense.

## 2. Put the code on GitHub

Vercel imports from GitHub.

1. Create a repo (e.g. `dragon-forge`).
2. Push this project’s `main` branch:

```bash
git remote add github git@github.com:YOUR_USER/dragon-forge.git
git push -u github main
```

(Or use Cursor’s **Create repo** / sync if you already have GitHub.)

## 3. Deploy on Vercel

1. [vercel.com](https://vercel.com) → sign in with GitHub.
2. **Add New → Project** → import **dragon-forge**.
3. Framework: **Next.js** (auto). Build: `npm run build`. Output: default.
4. **Environment variables** (Production):

| Name | Notes |
|------|--------|
| `AUTH_SECRET` | Long random string (32+ chars) |
| `SITE_URL` | `https://www.dragonfirecodex.com` |
| `ADSENSE_CLIENT`, `ADSENSE_SLOT_*` | When ready |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | When ready |
| `OPENAI_API_KEY` | Optional |

5. **Deploy**. Note the `*.vercel.app` URL; open `/team` to smoke-test.

### Server data (Talk / accounts / boards)

The app stores JSON under `data/` on disk. On **Vercel serverless**, that folder is **not durable** — registrations and Talk may reset after deploys or cold starts. **Pit data in the browser (localStorage) is unaffected.**

For persistent server data later: Railway/Render with a volume, or add a database. For AdSense + core tools, Vercel free is still enough to start.

## 4. Connect dragonfirecodex.com in Vercel

1. Vercel → project → **Settings → Domains**.
2. Add **`www.dragonfirecodex.com`** and **`dragonfirecodex.com`**.
3. Vercel shows DNS records — copy them exactly.

## 5. Cloudflare DNS (point at Vercel)

**DNS → Records** (replace old Cursor targets):

| Type | Name | Content (from Vercel) |
|------|------|------------------------|
| CNAME | `www` | e.g. `cname.vercel-dns.com` |
| A or CNAME | `@` | per Vercel (often A `76.76.21.21` or CNAME flatten) |

Proxy (orange cloud): **on** is usually fine.

**SSL/TLS** → **Full**.

Wait 5–30 minutes. Then:

- `https://www.dragonfirecodex.com/team` loads the app
- `https://dragonfirecodex.com` may redirect to `www` (set in Vercel)

## 6. AdSense & Google

- AdSense site URL: **`https://www.dragonfirecodex.com`** (match `SITE_URL`).
- Check `https://www.dragonfirecodex.com/ads.txt` after `ADSENSE_CLIENT` is set.
- Google OAuth redirect:  
  `https://www.dragonfirecodex.com/api/auth/google/callback`

## Cost

| Item | Typical |
|------|---------|
| Domain | Already paid |
| Cloudflare DNS | Free |
| Vercel Hobby | **$0** |
| **Total hosting** | **$0/mo** to start |

Upgrade only if you need durable server storage or heavy traffic.