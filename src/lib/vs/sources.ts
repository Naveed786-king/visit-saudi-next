// What a website page is built from: the admin's texts, guides, styling, added pages and posts, visual changes.
import { editsFor, getVs, stylingCss } from './store';

async function extra() {
  const [pages, posts, meta, html, chrome] = await Promise.all([getVs('vs.pages'), getVs('vs.posts'), getVs('vs.pageMeta'), getVs('vs.html'), getVs('vs.chrome')]);
  return { pages, posts, meta, html, chrome };
}
/** everything except the visual editor's changes (the page the editor's places refer to) */
export const baseSources = { edits: editsFor, guides: () => getVs('vs.guides'), styling: stylingCss, extra };
export const siteSources = { ...baseSources, visual: () => getVs('vs.visual') };
