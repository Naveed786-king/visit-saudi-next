// The simple text format used by the page and post editor (and the built-in guides):
//   ## Section heading            ### Sub-heading
//   Paragraph with **bold** and [a link](/apply)   (an empty line starts a new paragraph)
//   - bullet item                 1. numbered item
//   ![picture description](/uploads/media/2026/11/photo.jpg)
//   > Highlighted note
//   Q: A question                 A: Its answer   (shown as an FAQ, also for Google)
//   [button: Start your application](/apply)
//   [cta: Applying soon? | Have a specialist check your documents. | Start your application →](/apply)   (small call-out box)
// Turned into the same HTML (and CSS classes) as the website's own guides.
import { decEnt, escAttr, escText } from './esc';

export type Block =
  | { t: 'h2' | 'h3' | 'p' | 'note'; text: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'img'; alt: string; src: string }
  | { t: 'faq'; q: string; a: string }
  | { t: 'btn'; text: string; href: string }
  | { t: 'cta'; title: string; text: string; label: string; href: string };

const safeHref = (u: string) => {
  const s = String(u || '').trim();
  return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(s) && !/^\/\//.test(s) ? s : '#';
};

/** **bold** and [text](url) inside a line */
export function inline(text: string) {
  let out = '';
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out += escText(text.slice(last, m.index));
    if (m[1] !== undefined) out += '<b>' + escText(m[1]) + '</b>';
    else {
      const href = safeHref(m[3]);
      const ext = /^https?:\/\//i.test(href);
      out += '<a href="' + escAttr(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + escText(m[2]) + '</a>';
    }
    last = m.index + m[0].length;
  }
  return out + escText(text.slice(last));
}

export function parseRich(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: 'p', text: para.join('\n') });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    let m: RegExpMatchArray | null;
    if (line.startsWith('### ')) {
      flush();
      blocks.push({ t: 'h3', text: line.slice(4).trim() });
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ t: 'h2', text: line.slice(3).trim() });
    } else if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
      flush();
      blocks.push({ t: 'img', alt: m[1], src: m[2] });
    } else if ((m = line.match(/^\[cta:\s*([^\]|]*)\|([^\]|]*)\|([^\]]*)\]\(([^)\s]+)\)$/i))) {
      flush();
      blocks.push({ t: 'cta', title: m[1].trim(), text: m[2].trim(), label: m[3].trim(), href: m[4] });
    } else if ((m = line.match(/^\[button:\s*([^\]]+)\]\(([^)\s]+)\)$/i))) {
      flush();
      blocks.push({ t: 'btn', text: m[1].trim(), href: m[2] });
    } else if (/^[-*] /.test(line)) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev && prev.t === 'ul') prev.items.push(line.slice(2).trim());
      else blocks.push({ t: 'ul', items: [line.slice(2).trim()] });
    } else if ((m = line.match(/^\d+[.)] (.*)$/))) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev && prev.t === 'ol') prev.items.push(m[1].trim());
      else blocks.push({ t: 'ol', items: [m[1].trim()] });
    } else if (line.startsWith('> ')) {
      flush();
      blocks.push({ t: 'note', text: line.slice(2).trim() });
    } else if ((m = line.match(/^Q:\s*(.+)$/))) {
      flush();
      // the answer: following "A:" line(s)
      let a = '';
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const am = j < lines.length ? lines[j].trim().match(/^A:\s*(.*)$/) : null;
      if (am) {
        a = am[1];
        i = j;
      }
      blocks.push({ t: 'faq', q: m[1].trim(), a: a.trim() });
    } else para.push(line);
  }
  flush();
  return blocks;
}

export function blocksToRich(blocks: Block[]) {
  return blocks
    .map((b) => {
      switch (b.t) {
        case 'h2':
          return '## ' + b.text;
        case 'h3':
          return '### ' + b.text;
        case 'p':
          return b.text;
        case 'note':
          return '> ' + b.text;
        case 'ul':
          return b.items.map((x) => '- ' + x).join('\n');
        case 'ol':
          return b.items.map((x, i) => i + 1 + '. ' + x).join('\n');
        case 'img':
          return '![' + b.alt + '](' + b.src + ')';
        case 'faq':
          return 'Q: ' + b.q + '\nA: ' + b.a;
        case 'btn':
          return '[button: ' + b.text + '](' + b.href + ')';
        case 'cta':
          return '[cta: ' + b.title + ' | ' + b.text + ' | ' + b.label + '](' + b.href + ')';
      }
    })
    .join('\n\n');
}

/** HTML for the article area; headings get the guide's own "sec-N" anchors (used by the "In this guide" box) */
export function richToHtml(src: string) {
  const blocks = parseRich(src);
  let sec = 0;
  const faqs = blocks.filter((b): b is Extract<Block, { t: 'faq' }> => b.t === 'faq');
  const out: string[] = [];
  blocks.forEach((b, i) => {
    switch (b.t) {
      case 'h2':
        // the heading of the FAQ is not a section of the "In this guide" box
        out.push(blocks[i + 1]?.t === 'faq' ? '<h2>' + inline(b.text) + '</h2>' : '<h2 id="sec-' + sec++ + '">' + inline(b.text) + '</h2>');
        break;
      case 'h3':
        out.push('<h3>' + inline(b.text) + '</h3>');
        break;
      case 'p':
        out.push('<p>' + b.text.split('\n').map(inline).join('<br>') + '</p>');
        break;
      case 'note':
        out.push('<div class="summary" style="margin:18px 0"><p style="margin:0">' + inline(b.text) + '</p></div>');
        break;
      case 'ul':
        out.push('<ul>' + b.items.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ul>');
        break;
      case 'ol':
        out.push('<ol>' + b.items.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ol>');
        break;
      case 'img':
        out.push('<img class="heroimg" src="' + escAttr(safeHref(b.src)) + '" alt="' + escAttr(b.alt) + '" loading="lazy">');
        break;
      case 'faq':
        out.push('<details class="afaq"><summary>' + escText(b.q) + '</summary><p>' + inline(b.a) + '</p></details>');
        break;
      case 'btn':
        out.push('<p><a class="btn gold" href="' + escAttr(safeHref(b.href)) + '">' + escText(b.text) + '</a></p>');
        break;
      case 'cta':
        out.push('<div class="artcta-mini"><b>' + escText(b.title) + '</b><span>' + escText(b.text) + '</span><a href="' + escAttr(safeHref(b.href)) + '">' + escText(b.label) + '</a></div>');
        break;
    }
  });
  if (faqs.length) {
    const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/\*\*|\[([^\]]+)\]\([^)]*\)/g, '$1') } })) };
    out.push('<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>');
  }
  return out.join('\n');
}

/** Section headings (for the "In this guide" box) */
export function richHeadings(src: string) {
  const blocks = parseRich(src);
  return blocks
    .filter((b, i): b is { t: 'h2'; text: string } => b.t === 'h2' && blocks[i + 1]?.t !== 'faq')
    .map((b) => b.text.replace(/\*\*|\[([^\]]+)\]\([^)]*\)/g, '$1'));
}

export function readingMinutes(src: string) {
  const words = String(src || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/* ---------- back from the website's HTML to the editor text (built-in guides) ---------- */
function inlineBack(h: string) {
  return decEnt(
    h
      .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (m, href, t) => '[' + t.replace(/<[^>]+>/g, '') + '](' + href + ')')
      .replace(/<(b|strong)>([\s\S]*?)<\/\1>/g, '**$2**')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}
/** the top-level elements of an HTML piece (nesting of the same tag is respected) */
function topLevel(html: string) {
  const out: string[] = [];
  let i = 0;
  const VOID = /^(img|br|hr|input|meta|link)$/i;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    const between = html.slice(i, lt).trim();
    if (between) out.push('<p>' + between + '</p>');
    const m = html.slice(lt).match(/^<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/);
    if (!m) {
      // a closing tag or a comment without its element: skip it
      const gt = html.indexOf('>', lt);
      i = gt < 0 ? html.length : gt + 1;
      continue;
    }
    const name = m[1].toLowerCase();
    if (VOID.test(name) || m[0].endsWith('/>')) {
      out.push(m[0]);
      i = lt + m[0].length;
      continue;
    }
    const re = new RegExp('<(/?)' + name + '\\b[^>]*>', 'gi');
    re.lastIndex = lt + m[0].length;
    let depth = 1;
    let end = html.length;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(html))) {
      depth += mm[1] ? -1 : 1;
      if (!depth) {
        end = mm.index + mm[0].length;
        break;
      }
    }
    out.push(html.slice(lt, end));
    i = end;
  }
  return out;
}
export function htmlToRich(zone: string) {
  const blocks: Block[] = [];
  // a simple, forgiving walk over the top-level elements
  const parts = topLevel(zone);
  for (const part of parts) {
    const s = part.trim();
    if (!s || s.startsWith('<script')) continue;
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^<h2[^>]*>([\s\S]*?)<\/h2>/))) blocks.push({ t: 'h2', text: inlineBack(m[1]) });
    else if ((m = s.match(/^<h3[^>]*>([\s\S]*?)<\/h3>/))) blocks.push({ t: 'h3', text: inlineBack(m[1]) });
    else if ((m = s.match(/^<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/))) {
      const items = [...m[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x) => inlineBack(x[1])).filter(Boolean);
      if (items.length) blocks.push({ t: m[1] as 'ul' | 'ol', items });
    } else if ((m = s.match(/^<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/))) blocks.push({ t: 'faq', q: inlineBack(m[1]), a: inlineBack(m[2]) });
    else if ((m = s.match(/^<img[^>]*>/))) {
      const src = (s.match(/src="([^"]*)"/) || [])[1] || '';
      const alt = decEnt((s.match(/alt="([^"]*)"/) || [])[1] || '');
      if (src) blocks.push({ t: 'img', alt, src });
    } else if ((m = s.match(/^<p[^>]*>([\s\S]*?)<\/p>/))) {
      const btn = m[1].match(/^\s*<a [^>]*class="btn[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*$/) || m[1].match(/^\s*<a [^>]*href="([^"]*)"[^>]*class="btn[^"]*"[^>]*>([\s\S]*?)<\/a>\s*$/);
      if (btn) blocks.push({ t: 'btn', text: inlineBack(btn[2]), href: btn[1] });
      else {
        const t = inlineBack(m[1]);
        if (t) blocks.push({ t: 'p', text: t });
      }
    } else if ((m = s.match(/^<div class="artcta-mini">\s*<b>([\s\S]*?)<\/b>\s*<span>([\s\S]*?)<\/span>\s*<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/))) {
      blocks.push({ t: 'cta', title: inlineBack(m[1]), text: inlineBack(m[2]), label: inlineBack(m[4]), href: m[3] });
    } else if (s.startsWith('<div')) {
      const t = inlineBack(s);
      if (t) blocks.push({ t: 'note', text: t.replace(/\n+/g, ' ') });
    }
  }
  return blocksToRich(blocks);
}

/* ---------- translation of the editor text, keeping its markers and links ---------- */
type Seg = { kind: 'text'; s: string } | { kind: 'link'; s: string; href: string } | { kind: 'bold'; s: string };
function segments(line: string): Seg[] {
  const out: Seg[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ kind: 'text', s: line.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'bold', s: m[1] });
    else out.push({ kind: 'link', s: m[2], href: m[3] });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ kind: 'text', s: line.slice(last) });
  return out;
}
const shape = (line: string) =>
  segments(line)
    .filter((x) => x.kind !== 'text')
    .map((x) => (x.kind === 'link' ? 'L' + x.href : 'B'))
    .join('|');

/** Translates many lines that may hold **bold** and [links](url); markers and link targets are kept */
export async function translateInlineLines(lines: string[], tr: (texts: string[]) => Promise<string[]>) {
  const whole = await tr(lines);
  const out = lines.slice();
  const redo: number[] = [];
  lines.forEach((l, i) => {
    const t = whole[i] ?? l;
    if (shape(t) === shape(l)) out[i] = t;
    else redo.push(i);
  });
  if (redo.length) {
    // the engine changed the markup: translate the pieces separately and put the markup back
    const pieces: string[] = [];
    const segs = redo.map((i) => segments(lines[i]));
    segs.forEach((ss) => ss.forEach((x) => pieces.push(x.s)));
    const tp = await tr(pieces);
    let k = 0;
    redo.forEach((i, n) => {
      out[i] = segs[n]
        .map((x) => {
          const s = tp[k++] ?? x.s;
          const pad = (orig: string, t: string) => (!t.trim() ? orig : (/^\s/.test(orig) ? ' ' : '') + t.trim() + (/\s$/.test(orig) ? ' ' : ''));
          return x.kind === 'text' ? pad(x.s, s) : x.kind === 'bold' ? '**' + s.trim() + '**' : '[' + s.trim() + '](' + x.href + ')';
        })
        .join('');
    });
  }
  return out;
}

/** Translates editor text block by block */
export async function translateRich(src: string, tr: (texts: string[]) => Promise<string[]>) {
  const blocks = parseRich(src);
  const lines: string[] = [];
  const put: ((v: string[]) => void)[] = [];
  for (const b of blocks) {
    if (b.t === 'cta') {
      const i = lines.push(b.title, b.text, b.label) - 3;
      put.push((v) => {
        b.title = v[i];
        b.text = v[i + 1];
        b.label = v[i + 2];
      });
    } else if (b.t === 'h2' || b.t === 'h3' || b.t === 'note' || b.t === 'btn') {
      const i = lines.push(b.text) - 1;
      put.push((v) => (b.text = v[i]));
    } else if (b.t === 'p') {
      const ls = b.text.split('\n');
      const start = lines.length;
      lines.push(...ls);
      put.push((v) => (b.text = v.slice(start, start + ls.length).join('\n')));
    } else if (b.t === 'ul' || b.t === 'ol') {
      const start = lines.length;
      lines.push(...b.items);
      put.push((v) => (b.items = v.slice(start, start + b.items.length)));
    } else if (b.t === 'img') {
      if (b.alt) {
        const i = lines.push(b.alt) - 1;
        put.push((v) => (b.alt = v[i]));
      }
    } else if (b.t === 'faq') {
      const i = lines.push(b.q, b.a) - 2;
      put.push((v) => {
        b.q = v[i];
        b.a = v[i + 1];
      });
    }
  }
  if (!lines.length) return src;
  const v = await translateInlineLines(lines, tr);
  put.forEach((f) => f(v));
  return blocksToRich(blocks);
}
