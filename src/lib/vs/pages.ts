// Pages and posts added or changed in the admin, built from the website's own page designs:
// a new post looks exactly like a built-in guide, a new simple page like the website's legal pages.
// Nothing here runs for the website's own pages until the admin changes something.
import fs from 'fs';
import path from 'path';
import { SITE_ROOT, LANG_LIST } from './render';
import { decEnt, escAttr, escText } from './esc';
import { richHeadings, richToHtml, readingMinutes } from './rich';
import type { VsPage, VsPageMeta, VsPost, VsTr } from './store';

export const SITE_BASE = 'https://visit-saudi.ae';
const BRAND_TAIL = ' | Visit Saudi - visit-saudi.ae';

/** What the admin added or changed (all optional) */
export type SiteExtra = { pages: VsPage[]; posts: VsPost[]; meta: Record<string, VsPageMeta>; html: Record<string, string> };
export const emptyExtra = (x: Partial<SiteExtra>) => !(x.pages?.length || x.posts?.length || Object.keys(x.meta || {}).length || Object.keys(x.html || {}).length);

const tplCache: Record<string, { mtime: number; html: string }> = {};
function template(rel: string) {
  const fp = path.join(SITE_ROOT, rel);
  const st = fs.statSync(fp);
  const c = tplCache[rel];
  if (c && c.mtime === st.mtimeMs) return c.html;
  const html = fs.readFileSync(fp, 'utf8');
  tplCache[rel] = { mtime: st.mtimeMs, html };
  return html;
}
/** a built-in guide used as the design of new posts */
function guideTemplate() {
  const dir = path.join(SITE_ROOT, 'guides');
  const pref = 'alula-travel-guide.html';
  if (fs.existsSync(path.join(dir, pref))) return template('guides/' + pref);
  const f = fs.readdirSync(dir).find((x) => x.endsWith('.html'));
  return template('guides/' + f);
}

const absImg = (src: string) => (!src ? '' : /^https?:\/\//.test(src) ? src : SITE_BASE + (src.startsWith('/') ? src : '/' + src));
const rootImg = (src: string) => (!src || /^(https?:)?\/\//.test(src) || src.startsWith('/') ? src : '/' + src);

/** New browser title / description / share texts / address of a page */
export function setHead(html: string, o: { title?: string; description?: string; url?: string; image?: string }) {
  if (o.title !== undefined) {
    const t = escText(o.title);
    html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + t + '</title>');
    html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, (m, a, b) => a + escAttr(o.title!) + b);
    html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, (m, a, b) => a + escAttr(o.title!) + b);
  }
  if (o.description !== undefined) {
    for (const re of [/(<meta name="description" content=")[^"]*(")/, /(<meta property="og:description" content=")[^"]*(")/, /(<meta name="twitter:description" content=")[^"]*(")/])
      html = html.replace(re, (m, a, b) => a + escAttr(o.description!) + b);
  }
  if (o.url) {
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (m, a, b) => a + escAttr(o.url!) + b);
    html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, (m, a, b) => a + escAttr(o.url!) + b);
  }
  if (o.image) {
    html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, (m, a, b) => a + escAttr(absImg(o.image!)) + b);
    html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/, (m, a, b) => a + escAttr(absImg(o.image!)) + b);
  }
  // structured data of the page it was copied from does not belong to the new one
  return html;
}

/** The fields of a post or page in one language (English when no translation exists) */
export function fieldsIn<T extends { tr?: Record<string, VsTr> }>(x: T, lang: string | null): T {
  const t = lang ? x.tr?.[lang] : undefined;
  if (!t) return x;
  const out: any = { ...x };
  for (const k of ['title', 'subtitle', 'crumb', 'cat', 'excerpt', 'description', 'body', 'html'] as const) if (t[k]) out[k] = t[k];
  return out;
}

const plainText = (h: string) => decEnt(String(h || '').replace(/<[^>]+>/g, ' '));
/** A finished HTML article: its sections get the guide's "sec-N" anchors for the "In this guide" box */
export function htmlArticle(html: string) {
  const headings: string[] = [];
  let n = 0;
  const out = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>(\s*<details)?/g, (m, attrs: string | undefined, inner: string, faq: string | undefined) => {
    if (faq || /id="/.test(attrs || '')) return m;
    headings.push(plainText(inner).trim());
    return '<h2 id="sec-' + n++ + '"' + (attrs || '') + '>' + inner + '</h2>';
  });
  return { html: out, headings };
}

/* ---------------------------------------------------------------- posts */
export function buildPost(post0: VsPost, lang: string | null) {
  const post = fieldsIn(post0, lang);
  let html = guideTemplate();
  html = setHead(html, { title: post.title + BRAND_TAIL, description: post.excerpt || post.title, url: SITE_BASE + '/guides/' + post0.slug, image: post0.image || undefined });
  // remove structured data that described the template guide
  html = html.replace(/<head>([\s\S]*?)<\/head>/, (m, h) => '<head>' + h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '') + '</head>');
  const a = html.indexOf('<section class="artsec">');
  const b = html.indexOf('<div class="authorcard">', a);
  if (a < 0 || b < 0) return html;
  let head = html.slice(a, b);
  head = head.replace(/(<div class="crumb"[^>]*><a href="\/guides">[^<]*<\/a>)[^<]*(<\/div>)/, (m, x, y) => x + ' &nbsp;/&nbsp; ' + escText(post.cat || 'News') + y);
  head = head.replace(/(<h1[^>]*>)[\s\S]*?(<\/h1>)/, (m, x, y) => x + escText(post.title) + y);
  head = head.replace(/(<p class="meta"[^>]*>)[\s\S]*?(<\/p>)/, (m, x, y) => x + readingMinutes(post.html ? plainText(post.html) : post.body) + ' min read &nbsp;|&nbsp; By the Visit Saudi team &nbsp;|&nbsp; ' + escText(post0.date || '') + y);
  if (post0.image) head = head.replace(/<img class="heroimg"[^>]*>/, '<img class="heroimg" src="' + escAttr(rootImg(post0.image)) + '" alt="' + escAttr(post.title) + '">');
  else head = head.replace(/<img class="heroimg"[^>]*>\s*/, '');
  head = head.replace(/(<p class="lead"[^>]*>)[\s\S]*?(<\/p>)/, (m, x, y) => (post.excerpt ? x + escText(post.excerpt) + y : ''));
  head = head.replace(/<div class="summary"[\s\S]*?<\/ul><\/div>\s*/, '');
  const art = post.html ? htmlArticle(post.html) : { html: richToHtml(post.body), headings: richHeadings(post.body) };
  const hs = art.headings;
  head = head.replace(/<div class="tocbox">[\s\S]*?<\/ol><\/div>\s*/, hs.length > 1 ? '<div class="tocbox"><b>In this guide</b><ol>' + hs.map((h, i) => '<li><a href="#sec-' + i + '">' + escText(h) + '</a></li>').join('') + '</ol></div>\n' : '');
  // the article text: from the first section heading of the template to the author card
  const z = head.indexOf('<h2 id="sec-');
  if (z >= 0) head = head.slice(0, z);
  return html.slice(0, a) + head + art.html + '\n' + html.slice(b);
}

/** Cards of the added posts on /guides (newest first), in the same design as the guide cards */
export function postCards(posts: VsPost[], lang: string | null) {
  return posts
    .map((p0) => {
      const p = fieldsIn(p0, lang);
      const q = (p.title + ' ' + (p.excerpt || '') + ' ' + (p.cat || '')).toLowerCase();
      return (
        '<article class="post rv" data-cat="' + escAttr(p0.cat || 'News') + '" data-q="' + escAttr(q) + '">' +
        (p0.image ? '<img src="' + escAttr(rootImg(p0.image)) + '" alt="' + escAttr(p.title) + '" loading="lazy">' : '') +
        '<div class="body">\n<span class="pill">' + escText(p.cat || 'News') + '</span><h3><a href="/guides/' + escAttr(p0.slug) + '" style="color:inherit">' + escText(p.title) + '</a></h3>\n' +
        '<p>' + escText(p.excerpt || '') + '</p><span class="meta">' + escText(p.cat || 'News') + ' &middot; ' + readingMinutes(p0.html ? plainText(p0.html) : p0.body) + ' min read &middot; ' + escText(p0.date || '') + '</span></div></article>'
      );
    })
    .join('');
}
export function injectPostCards(html: string, posts: VsPost[], lang: string | null) {
  if (!posts.length) return html;
  html = html.replace(/(<div class="postgrid" id="blogGrid">)/, (m) => m + postCards(posts, lang));
  // a filter button for a new category
  const have = new Set([...html.matchAll(/data-bcat="([^"]*)"/g)].map((m) => decEnt(m[1])));
  const add = Array.from(new Set(posts.map((p) => p.cat || 'News'))).filter((c) => !have.has(c));
  if (add.length) {
    const last = [...html.matchAll(/<button class="tab" data-bcat="[^"]*">[\s\S]*?<\/button>/g)].pop();
    if (last && last.index !== undefined) {
      const at = last.index + last[0].length;
      html = html.slice(0, at) + add.map((c) => '<button class="tab" data-bcat="' + escAttr(c) + '">' + escText(c) + '</button>').join('') + html.slice(at);
    }
  }
  return html;
}

/* ---------------------------------------------------------------- simple pages */
export function buildSimplePage(page0: VsPage, lang: string | null) {
  const pg = fieldsIn(page0, lang);
  let html = template('privacy.html');
  html = setHead(html, { title: pg.title + BRAND_TAIL, description: pg.description || pg.subtitle || pg.title, url: SITE_BASE + '/' + page0.slug, image: page0.image || undefined });
  html = html.replace(/<head>([\s\S]*?)<\/head>/, (m, h) => '<head>' + h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '') + '</head>');
  const a = html.indexOf('<div class="pagehero">');
  const b = html.indexOf('<section style="padding-top:0"><div class="wrap"><div class="ctaband', a);
  if (a < 0 || b < 0) return html;
  const bg = rootImg(page0.image) || '/assets/img/desert.jpg';
  const hero =
    '<div class="pagehero"><div class="phbg" style="background-image:url(\'' + escAttr(bg).replace(/'/g, '%27') + '\')"></div><div class="phshade"></div><div class="wrap">' +
    (pg.crumb ? '<div class="crumb">' + escText(pg.crumb) + '</div>' : '') +
    '<h1>' + escText(pg.title) + '</h1>' + (pg.subtitle ? '<p>' + escText(pg.subtitle) + '</p>' : '') + '</div></div>\n';
  const body = '<section><div class="wrap"><article class="article">\n' + richToHtml(pg.body) + '\n</article></div></section>\n';
  return html.slice(0, a) + hero + body + html.slice(b);
}

/** A full-HTML page made in the admin: its own head; the address and the canonical link follow the new address */
export function buildHtmlPage(page: VsPage) {
  let html = page.html || '';
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (m, a, b) => a + SITE_BASE + '/' + page.slug + b);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, (m, a, b) => a + SITE_BASE + '/' + page.slug + b);
  return html;
}

/* ---------------------------------------------------------------- sitemap */
export function sitemapXml(xml: string, ex: SiteExtra, hiddenGuides: string[] = []) {
  const hidden = new Set(Object.entries(ex.meta).filter(([, v]) => v.hidden).map(([k]) => k));
  for (const g of hiddenGuides) hidden.add('/guides/' + g);
  if (hidden.size) xml = xml.replace(/<url><loc>https?:\/\/[^/<]+([^<]*)<\/loc><\/url>\n?/g, (m, p) => (hidden.has(p || '/') ? '' : m));
  const add = [
    ...ex.pages.filter((p) => p.published).map((p) => '/' + p.slug),
    ...ex.posts.filter((p) => p.published).map((p) => '/guides/' + p.slug),
  ];
  if (add.length) xml = xml.replace('</urlset>', add.map((p) => '<url><loc>' + SITE_BASE + p + '</loc></url>').join('\n') + '\n</urlset>');
  return xml;
}

/* ---------------------------------------------------------------- texts of a page (for the translator) */
const TOKEN_RE = /(<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/g;
export function pageTexts(html: string) {
  const out = new Set<string>();
  for (const tok of html.split(TOKEN_RE)) {
    if (!tok) continue;
    if (tok[0] === '<') {
      if (/^<(script|style|!--)/i.test(tok)) continue;
      for (const m of tok.matchAll(/\b(alt|title|placeholder|content)="([^"]*)"/g)) {
        const v = m[2];
        if (/\p{L}/u.test(v) && !/^(https?:|\/|width=|#)/.test(v)) out.add(v);
      }
    } else {
      const c = tok.trim();
      if (c && /\p{L}/u.test(decEnt(c))) out.add(c);
    }
  }
  return Array.from(out);
}

export const ALL_LANGS = LANG_LIST;
