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

1. GitHub repo: **https://github.com/DaviRiv/dragonfire-codex**
2. From a clone of this project:

```bash
git remote add github https://github.com/DaviRiv/dragonfire-codex.git
git push -u github main
```

(If `github` already exists: `git push -u github main` only.)

## 3. Deploy on Vercel

1. [vercel.com](https://vercel.com) → sign in with GitHub.
2. **Add New → Project** → import **dragonfire-codex**.
3. Framework: **Next.js** (auto). Build: `npm run build`. Output: default.
4. **Storage → Create → Blob**. Create a private Blob store and connect it to this project (Production). Registration writes `users.json` there. Without that store, Create account fails because Vercel cannot save files on disk.
5. **Environment variables** (Production):

| Name | Notes |
|------|--------|
| `AUTH_SECRET` | Long random string (32+ chars) |
| `SITE_URL` | `https://www.dragonfirecodex.com` |
| `ADSENSE_CLIENT`, `ADSENSE_SLOT_*` | When ready |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | When ready |
| `OPENAI_API_KEY` | Optional |

6. **Deploy** (redeploy after the Blob store is connected so the project picks up the store). Note the `*.vercel.app` URL; open `/team` to smoke-test, then create an account.

### Server data (Talk / accounts / boards)

Accounts, Talk, and boards are JSON documents. Locally they live under `data/`. On **Vercel** they live in the connected **Blob** store (`dragonfire/users.json` and the same for talk and boards). **Pit data in the browser (localStorage) is unaffected.**

`AUTH_SECRET` must be set on Vercel. The server cannot write `data/.auth-secret` there.

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