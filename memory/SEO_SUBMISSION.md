# SEO — Submit Konekt to Search Engines

Once per site lifetime. Total: ~4 minutes.

## 1. Google Search Console (2 min)

1. Open **<https://search.google.com/search-console/welcome>** (sign in with the Konekt company Google account).
2. Click **Add property** → **URL prefix** → paste `https://konekt.co.tz` → Continue.
3. Google asks you to verify ownership. **Easiest method: DNS TXT record**.
   - Copy the TXT value Google shows (looks like `google-site-verification=abc123…`).
   - In Cloudflare → `konekt.co.tz` DNS → Add record → Type `TXT` → Name `@` → Content `<paste>` → Save.
   - Back in Google, click **Verify**. (Cloudflare TXT propagates in 1-2 min.)
4. Once verified, left sidebar → **Sitemaps** → paste `sitemap.xml` in the "Add a new sitemap" box → **Submit**.
5. Done. Google will crawl all 822 URLs over the next 24–72 hours.

## 2. Bing Webmaster Tools (2 min)

1. Open **<https://www.bing.com/webmasters>** (sign in with Microsoft/Outlook account).
2. Click **Import from Google Search Console** — Bing will pull your property + ownership automatically (zero extra verification).
   - OR add the site manually via a meta tag / XML file / CNAME.
3. Sidebar → **Sitemaps** → **Submit sitemap** → `https://konekt.co.tz/sitemap.xml`.

## 3. IndexNow (auto-push on every change — recommended)

IndexNow is the modern replacement for the old Google/Bing `/ping?sitemap=` URLs (both deprecated). One POST → Bing + Yandex + Naver + Seznam all pick up the change within minutes.

**Setup (one-time, 2 min):**
1. Generate a random 32-char hex string (key). Example: `konekt-$(python3 -c "import secrets;print(secrets.token_hex(16))")`.
2. Create `/app/frontend/public/<KEY>.txt` containing just that key string on a single line.
3. Set `INDEXNOW_KEY=<KEY>` in `/app/backend/.env` and restart backend.

Now every time someone hits `POST /api/seo/sitemap/regenerate` (auto-triggered after every Smart-Import commit), the backend automatically posts the newest 1000 URLs to `https://api.indexnow.org/indexnow`. No cron job needed.

**Google** still requires a one-time manual submission in Search Console (step 1 above). They removed the auto-ping endpoint in 2023; the Search Console API works but needs OAuth setup — not worth it for a single-site deploy.

## 4. Ongoing — nothing
The sitemap is already regenerated after every URL scrape, AI PDF import, or CSV commit that publishes to the marketplace. Search engines will pick up new products automatically on their next crawl.
