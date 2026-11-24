// Small HTML helpers shared by the page renderer and the editor format
export function escAttr(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
export function escText(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", copy: '©', nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', mdash: '—', ndash: '–' };
export function decEnt(s: string) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|copy|nbsp|rsquo|lsquo|ldquo|rdquo|hellip|mdash|ndash);/g, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return isNaN(n) ? m : String.fromCodePoint(n);
    }
    return ENT[e] || m;
  });
}
