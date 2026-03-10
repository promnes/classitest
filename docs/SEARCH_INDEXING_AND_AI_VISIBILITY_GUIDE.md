# Classify Search Indexing and AI Visibility Guide

This guide explains how to index `classi-fy.com` correctly in Google and other search engines, and how to improve visibility for AI assistants and answer engines.

## 1. Current status in this repository

Implemented in codebase:
- `client/public/sitemap.xml`
- `client/public/robots.txt`
- `client/public/llms.txt`
- Rich SEO metadata in `client/index.html`
- Dynamic per-route SEO in `client/src/hooks/useSEO.tsx`

Important:
- Public pages are indexable.
- Private dashboards and `/api/*` are blocked.

## 2. Google Search Console checklist

Open: `https://search.google.com/search-console/index?resource_id=sc-domain%3Aclassi-fy.com`

Do this in order:
1. Verify ownership for `sc-domain:classi-fy.com`.
2. Submit sitemap: `https://classi-fy.com/sitemap.xml`.
3. Use URL Inspection for:
   - `https://classi-fy.com/`
   - `https://classi-fy.com/download`
   - `https://classi-fy.com/trial-games`
   - `https://classi-fy.com/parent-auth`
4. Click Request Indexing for priority pages.
5. Check Page Indexing report and fix any:
   - Crawled - currently not indexed
   - Excluded by noindex
   - Duplicate without user-selected canonical
6. Confirm Core Web Vitals and mobile usability.

## 3. Bing, Yandex, and others

### Bing Webmaster Tools
1. Add property `https://classi-fy.com`.
2. Submit sitemap `https://classi-fy.com/sitemap.xml`.
3. Use URL submission for main pages.

### Yandex Webmaster
1. Add site.
2. Submit sitemap.
3. Review crawling diagnostics.

### Optional submission hubs
- IndexNow for Bing and Yandex (recommended for faster discovery).

## 4. AI visibility (ChatGPT, Perplexity, Claude, Gemini)

### Technical setup now
- AI crawlers are allowed in `robots.txt` for public content.
- `llms.txt` provides a clean map of key pages and usage guidance.
- Rich metadata and structured data exist in `index.html`.

### Content requirements for AI recommendation quality
1. Keep product pages explicit about who the app is for.
2. Keep policy and trust pages updated.
3. Keep organization details consistent (name, domain, support email).
4. Keep screenshots and feature lists current.

## 5. Required production checks

Run after each deployment:
1. `https://classi-fy.com/robots.txt` returns 200.
2. `https://classi-fy.com/sitemap.xml` returns 200.
3. `https://classi-fy.com/llms.txt` returns 200.
4. Canonical tag matches final URL.
5. No accidental `noindex` on public pages.

## 6. Recommended monthly SEO/AI routine

1. Refresh `lastmod` in sitemap for changed pages.
2. Re-submit sitemap in Search Console if major updates happened.
3. Inspect 3-5 important URLs in GSC.
4. Validate structured data (Rich Results Test).
5. Audit robots and ensure private routes remain blocked.

## 7. High-impact improvements to plan next

1. Add server-side rendering or prerender for critical marketing routes.
2. Add dedicated Arabic and English static landing pages with unique copy.
3. Add FAQ structured data on public pages.
4. Integrate IndexNow auto-ping on publish/deploy.
5. Add a changelog/news page for fresh crawl signals.

## 8. Quick copy-paste commands for verification

```bash
curl -I https://classi-fy.com/robots.txt
curl -I https://classi-fy.com/sitemap.xml
curl -I https://classi-fy.com/llms.txt
```

Expected: `HTTP/2 200` for all three.
