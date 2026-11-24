// Moves the data of the old visit-saudi.ae app (its DATA_DIR folder) into this app's database.
//   node scripts/import-legacy.mjs /home/visit_saudi/vsa-data          -> dry run: only counts
//   node scripts/import-legacy.mjs /home/visit_saudi/vsa-data --write  -> import
//   add --no-email on a test copy: the old email settings are not taken over
// Safe to run again: applications already imported (same VSA reference) are skipped, stores are replaced.
// Nothing in the old folder is changed or deleted.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['.env.local', '.env']) {
  const f = path.join(root, name);
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DATA = process.argv[2];
const WRITE = process.argv.includes('--write');
// --no-email: leave the email (SMTP) settings out, e.g. on a test copy, so it never emails real customers
const NO_EMAIL = process.argv.includes('--no-email');
if (!DATA || !fs.existsSync(DATA)) {
  console.error('Usage: node scripts/import-legacy.mjs <old DATA_DIR> [--write]');
  process.exit(1);
}
const UPLOAD_ROOT = path.resolve(root, process.env.UPLOAD_DIR || 'uploads');
const prisma = new PrismaClient();

const readJsonl = (f) => {
  try {
    return fs.readFileSync(path.join(DATA, f), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
};
const readJson = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  } catch {
    return d;
  }
};
const VISA_LABELS = {
  'one-year-multiple': '1 Year Multiple Entry Visa', 'ninety-day-multiple': '90 Days Multiple Entry Visa', tourist: 'Tourist eVisa', family: 'Family & Friends Visit Visa',
  umrah: 'Umrah Visa', business: 'Business Visit Visa', medical: 'Medical Treatment Visa', personal: 'Personal Visit Visa', transit: 'Stopover Transit Visa',
  work: 'Employment Visa Guidance', hajj: 'Hajj Visa Guidance',
};
// the old six stages are the default step list of this app
const STEP_IDS = ['received', 'doc-check', 'submitted', 'with-authority', 'decision', 'evisa-ready'];
const STATUS = ['submitted', 'under_review', 'processing', 'processing', 'initial_approval', 'completed'];
const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function copyFile(src, rel) {
  if (!WRITE) return;
  const dst = path.join(UPLOAD_ROOT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

async function setStore(key, value) {
  if (!WRITE) return;
  const json = JSON.stringify(value);
  await prisma.setting.upsert({ where: { key }, update: { value: json }, create: { key, value: json } });
}

async function main() {
  const apps = readJsonl('applications.jsonl');
  const enq = readJsonl('enquiries.jsonl');
  const stats = readJsonl('stats.jsonl');
  const settings = readJson('settings.json', null);
  const blog = readJson('blog.json', []);
  const reviews = readJson('reviews.json', []);
  const edits = readJson('content-edits.json', {});
  const guides = readJson('guide-overrides.json', {});
  const notes = readJson('customers.json', {});
  console.log(`Old data: ${apps.length} applications, ${enq.length} enquiries, ${stats.length} stats rows, ${blog.length} news posts, ${reviews.length} reviews, ${Object.keys(guides).length} guide edits, text edits in ${Object.keys(edits).length} languages`);
  if (!WRITE) console.log('Dry run — add --write to import.');

  let added = 0, skipped = 0, files = 0;
  for (const a of apps) {
    if (!a.ref) continue;
    if (await prisma.application.findUnique({ where: { refNo: a.ref }, select: { id: true } })) {
      skipped++;
      continue;
    }
    added++;
    if (!WRITE) continue;
    const email = String(a.email || `${a.ref.toLowerCase()}@no-email.visit-saudi.ae`).toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) user = await prisma.user.create({ data: { name: a.name || a.ref, email, phone: a.phone || null, nationality: a.nat || null, passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10), role: 'CUSTOMER', createdAt: a.created ? new Date(a.created) : undefined } });
    const stage = Math.max(0, Math.min(5, Number(a.stage) || 0));
    const dates = {};
    for (const h of a.history || []) if (STEP_IDS[h.stage] && !dates[STEP_IDS[h.stage]]) dates[STEP_IDS[h.stage]] = h.at;
    for (let i = 0; i <= stage; i++) dates[STEP_IDS[i]] = dates[STEP_IDS[i]] || a.updated || a.created;
    const vs = {
      visa: a.visa, entry: a.entry, exit: a.exit, prof: a.prof, passexp: a.passexp, city: a.city, purpose: a.purpose, express: !!a.express,
      officialRef: a.officialRef || '',
      history: (a.history || []).map((h) => ({ stage: h.stage, at: h.at, by: h.by, note: h.note, clientNote: h.clientNote })),
      pay: a.ziina_intent || a.paid ? { status: a.paid ? 'paid' : a.pay_status || '', intent: a.ziina_intent || '', url: a.ziina_url || '', at: a.ziina_at || '', amount: a.ziina_amount, currency: a.ziina_currency, paidAt: a.paid_at || '', amountPaid: a.amount_paid || '' } : undefined,
    };
    const app = await prisma.application.create({
      data: {
        refNo: a.ref,
        userId: user.id,
        service: VISA_LABELS[a.visa] || a.visa || 'Saudi visa',
        fullName: a.name || a.ref,
        email: a.email || null,
        phone: a.phone || null,
        nationality: a.nat || null,
        passportNo: a.pass || null,
        dateOfBirth: a.dob || null,
        status: STATUS[stage],
        progress: Math.round(((stage + 1) / 6) * 100),
        stageId: STEP_IDS[stage],
        stageDates: JSON.stringify(dates),
        seen: true,
        token: crypto.randomBytes(16).toString('hex'),
        createdAt: a.created ? new Date(a.created) : undefined,
        meta: JSON.stringify({ vs }),
      },
    });
    const dir = path.join(DATA, 'uploads', a.ref);
    const docFile = (name) => {
      const src = path.join(dir, path.basename(name || ''));
      if (!name || !fs.existsSync(src)) return null;
      const rel = `private/${app.id}/${path.basename(name)}`;
      copyFile(src, rel);
      files++;
      return { rel, size: fs.statSync(src).size, mime: MIME[(name.split('.').pop() || '').toLowerCase()] || 'application/octet-stream' };
    };
    for (const d of a.docs || []) {
      const f = docFile(d.name);
      if (f) await prisma.document.create({ data: { applicationId: app.id, name: `${d.kind || 'document'}: ${d.name}`, path: f.rel, mime: f.mime, size: f.size, uploadedBy: 'customer' } });
    }
    const patch = {};
    if (a.issuedDoc) {
      const f = docFile(a.issuedDoc.file || a.issuedDoc.name);
      if (f) {
        patch.issuedDoc = { name: a.issuedDoc.name, path: f.rel };
        await prisma.document.create({ data: { applicationId: app.id, name: `eVisa: ${a.issuedDoc.name}`, path: f.rel, mime: f.mime, size: f.size, uploadedBy: 'admin' } });
      }
    }
    if (a.resolution) {
      const r = { status: a.resolution.status || '', amount: a.resolution.amount || '', date: a.resolution.date || '', comment: a.resolution.comment || '' };
      if (a.resolution.proof) {
        const f = docFile(a.resolution.proof.file || a.resolution.proof.name);
        if (f) r.proof = { name: a.resolution.proof.name, path: f.rel };
      }
      patch.resolution = r;
    }
    if (Object.keys(patch).length) await prisma.application.update({ where: { id: app.id }, data: { meta: JSON.stringify({ vs: { ...vs, ...patch } }) } });
    for (const m of a.messages || []) {
      await prisma.message.create({ data: { applicationId: app.id, body: String(m.text || ''), fromAdmin: m.from === 'team', senderId: m.from === 'team' ? null : user.id, read: true, createdAt: m.at ? new Date(m.at) : undefined } });
    }
  }
  console.log(`Applications: ${added} to import, ${skipped} already here, ${files} files copied`);

  if (WRITE && enq.length && !(await prisma.lead.count({ where: { source: 'website (old app)' } }))) {
    for (const e of enq) await prisma.lead.create({ data: { name: e.name || '-', email: e.email || null, phone: e.phone || null, service: e.topic || null, message: e.msg || null, source: 'website (old app)', status: 'contacted', seen: true, createdAt: e.at ? new Date(e.at) : undefined } });
  }
  console.log(`Enquiries: ${enq.length}`);

  if (WRITE && stats.length && !(await prisma.vsEvent.count())) {
    const rows = stats.filter((s) => s && s.t && s.day).map((s) => ({ t: String(s.t).slice(0, 20), path: String(s.path || '').slice(0, 120), lang: String(s.lang || '').slice(0, 5), nat: String(s.nat || '').slice(0, 60), day: String(s.day).slice(0, 10), createdAt: s.at ? new Date(s.at) : new Date() }));
    for (let i = 0; i < rows.length; i += 500) await prisma.vsEvent.createMany({ data: rows.slice(i, i + 500) });
  }
  console.log(`Stats rows: ${stats.length}`);

  if (settings) {
    await setStore('vs.site', { whatsapp: settings.whatsapp || '971566556645', email: settings.email || 'info@visit-saudi.ae', notifyEmail: settings.notifyEmail || '', prices: settings.prices || {}, payments: { enabled: !!settings.payments?.enabled, provider: settings.payments?.provider || '' } });
    // the old email (SMTP) settings → Admin → Settings & email
    if (WRITE && !NO_EMAIL && settings.smtp?.host) {
      const row = await prisma.setting.findUnique({ where: { key: 'smtp' } });
      const cur = row ? JSON.parse(row.value) : {};
      const smtp = { ...cur, host: settings.smtp.host, port: Number(settings.smtp.port) || 587, secure: Number(settings.smtp.port) === 465, user: settings.smtp.user, pass: settings.smtp.pass || cur.pass || '', from: settings.smtp.from || settings.smtp.user, notifyEmail: settings.notifyEmail || cur.notifyEmail || '' };
      await setStore('smtp', smtp);
    }
    console.log('Settings: prices, payment switch, contact and email settings');
  }
  await setStore('vs.blog', blog);
  await setStore('vs.reviews', reviews);
  await setStore('vs.content', edits);
  await setStore('vs.guides', guides);
  await setStore('vs.customerNotes', notes);

  const mdir = path.join(DATA, 'media');
  let media = 0;
  if (fs.existsSync(mdir)) for (const f of fs.readdirSync(mdir)) if (/\.(png|jpe?g|webp)$/i.test(f)) { copyFile(path.join(mdir, f), `media/${f}`); media++; }
  console.log(`Media pictures: ${media} (still at /media/<name>)`);
  console.log(WRITE ? 'Import finished.' : 'Dry run finished — nothing was written.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
