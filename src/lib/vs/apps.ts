// The website's own apply / track / message / document flows (same requests and answers as the old server),
// stored in the shared Application tables so the admin, WhatsApp, payments and the client dashboard all see them.
import crypto from 'crypto';
import type { Application, Document, Message, Payment } from '@prisma/client';
import { prisma } from '@/lib/db';
import { hashPassword, checkPassword, getSession, startSession, isStaff } from '@/lib/auth';
import { writeStored } from '@/lib/upload';
import { notifyAdmin, rowsTable } from '@/lib/mail';
import { ensureToken, setStage, stepsFor, stageDatesOf, currentStageId, fileLink } from '@/lib/portal/files';
import { notifyClient, notifyTeam } from '@/lib/portal/notify';

export const VISA_LABELS: Record<string, string> = {
  'one-year-multiple': '1 Year Multiple Entry Visa',
  'ninety-day-multiple': '90 Days Multiple Entry Visa',
  tourist: 'Tourist eVisa',
  family: 'Family & Friends Visit Visa',
  umrah: 'Umrah Visa',
  business: 'Business Visit Visa',
  medical: 'Medical Treatment Visa',
  personal: 'Personal Visit Visa',
  transit: 'Stopover Transit Visa',
  work: 'Employment Visa Guidance',
  hajj: 'Hajj Visa Guidance',
};
export const visaLabel = (slug: string) => VISA_LABELS[slug] || slug;
export const visaSlug = (service: string) => Object.keys(VISA_LABELS).find((k) => VISA_LABELS[k] === service) || service;

/** Extra fields of a website application (kept in Application.meta.vs) */
export type VsMeta = {
  visa?: string;
  entry?: string;
  exit?: string;
  prof?: string;
  passexp?: string;
  city?: string;
  purpose?: string;
  express?: boolean;
  officialRef?: string;
  issuedDoc?: { name: string; path: string } | null;
  resolution?: { status: string; amount: string; date: string; comment: string; proof?: { name: string; path: string } } | null;
  history?: { stage: number; at: string; note?: string; clientNote?: string; by?: string }[];
  pay?: { status?: string; intent?: string; url?: string; at?: string; amount?: number; currency?: string; paidAt?: string; amountPaid?: string };
};
export function metaOf(a: Pick<Application, 'meta'>): Record<string, any> {
  try {
    return a.meta ? JSON.parse(a.meta) : {};
  } catch {
    return {};
  }
}
export const vsOf = (a: Pick<Application, 'meta'>): VsMeta => metaOf(a).vs || {};
export async function saveVsMeta(id: string, patch: Partial<VsMeta>) {
  const a = await prisma.application.findUnique({ where: { id }, select: { meta: true } });
  if (!a) return null;
  const m = metaOf(a);
  m.vs = { ...(m.vs || {}), ...patch };
  return prisma.application.update({ where: { id }, data: { meta: JSON.stringify(m) } });
}

/** VSA-XXXXXX, as before */
export async function newRef() {
  for (let i = 0; i < 20; i++) {
    const ref = 'VSA-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    if (!(await prisma.application.findUnique({ where: { refNo: ref }, select: { id: true } }))) return ref;
  }
  throw new Error('no free reference');
}

/** Same file check as the old server: the content must match the extension */
export function magicOk(buf: Buffer, name: string) {
  if (!buf || buf.length < 4) return false;
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (buf[0] === 0xff && buf[1] === 0xd8) return ext === 'jpg' || ext === 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return ext === 'png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return ext === 'webp';
  if (buf.slice(0, 4).toString() === '%PDF') return ext === 'pdf';
  return false;
}
const MIME_OF: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const safeName = (n: string) => String(n).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);

/** Saves a base64 data URL as a private file of the application */
export async function storeDataUrl(appId: string, dataUrl: string, name: string, maxBytes: number) {
  if (!dataUrl || !name) return null;
  const buf = Buffer.from(String(dataUrl).split(',').pop() || '', 'base64');
  if (buf.length > maxBytes || !magicOk(buf, name)) return null;
  const safe = safeName(name);
  const ext = (safe.split('.').pop() || '').toLowerCase();
  const rel = `private/${appId.replace(/[^a-zA-Z0-9_-]/g, '')}/${Date.now().toString(36)}-${safe}`;
  await writeStored(rel, buf, MIME_OF[ext] || 'application/octet-stream');
  return { name: safe, path: rel, size: buf.length, mime: MIME_OF[ext] || 'application/octet-stream' };
}

/** The client account behind an application: one per email.
 * With a password (the apply page asks for one): a new client gets that password and is signed in; a returning
 * client who types their own password is signed in; a different password still files the application to their
 * account, without signing in (nobody can take over an account by applying with its email).
 * Without a password (older pages): a closed account the client opens later with "Forgot password". */
async function customerFor(name: string, email: string, phone: string, nat: string, password: string) {
  const em = email.toLowerCase();
  const u = await prisma.user.findUnique({ where: { email: em } });
  if (u) {
    // a team member applying with their own email (e.g. a test): the file is saved on that account, nobody is signed in
    if (isStaff(u.role)) return { user: u, signIn: false, account: 'existing' as const };
    const signIn = !!password && u.active && (await checkPassword(password, u.passwordHash));
    return { user: u, signIn, account: signIn ? ('signed-in' as const) : ('existing' as const) };
  }
  const created = await prisma.user.create({
    data: { name, email: em, phone, nationality: nat || null, passwordHash: await hashPassword(password || crypto.randomBytes(24).toString('hex')), role: 'CUSTOMER' },
  });
  return { user: created, signIn: !!password, account: password ? ('new' as const) : ('closed' as const) };
}

export type ApplyBody = Record<string, any>;

/** POST /api/apply from the website's apply page (JSON) */
export async function websiteApply(b: ApplyBody): Promise<{ status: number; body: Record<string, unknown> }> {
  for (const f of ['visa', 'name', 'nat', 'pass', 'email', 'phone', 'entry']) if (!b[f] || String(b[f]).trim() === '') return { status: 400, body: { ok: false, error: 'Missing field: ' + f } };
  if (!/^\S+@\S+\.\S+$/.test(b.email)) return { status: 400, body: { ok: false, error: 'Invalid email', field: 'email' } };
  const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
  if (password && password.length < 8) return { status: 400, body: { ok: false, error: 'Password must be at least 8 characters', field: 'password', code: 'pw_short' } };
  const name = String(b.name).slice(0, 90);
  const visa = String(b.visa).slice(0, 30);
  const email = String(b.email).slice(0, 120);
  const phone = String(b.phone).slice(0, 40);
  const nat = String(b.nat).slice(0, 60);
  const acc = await customerFor(name, email, phone, nat, password);
  if ('error' in acc) return { status: 400, body: { ok: false, error: 'This email belongs to a team account. Please use the client’s own email.', field: 'email', code: acc.error } };
  const userId = acc.user.id;
  const ref = await newRef();
  const now = new Date().toISOString();
  const vs: VsMeta = {
    visa,
    entry: String(b.entry).slice(0, 12),
    exit: String(b.exit || '').slice(0, 12),
    prof: String(b.prof || '').slice(0, 60),
    passexp: String(b.passexp || '').slice(0, 12),
    city: String(b.city || '').slice(0, 60),
    purpose: String(b.purpose || '').slice(0, 60),
    express: !!b.express,
    history: [{ stage: 0, at: now, by: 'system', note: 'Application received' }],
  };
  const app = await prisma.application.create({
    data: {
      refNo: ref,
      userId,
      service: visaLabel(visa),
      fullName: name,
      email,
      phone,
      nationality: nat,
      passportNo: String(b.pass).toUpperCase().slice(0, 30),
      dateOfBirth: String(b.dob || '').slice(0, 12) || null,
      notes: [vs.express ? 'Express processing requested' : '', vs.entry ? `Entry: ${vs.entry}` : '', vs.exit ? `Exit: ${vs.exit}` : '', vs.purpose ? `Purpose: ${vs.purpose}` : ''].filter(Boolean).join('\n') || null,
      status: 'submitted',
      progress: 10,
      meta: JSON.stringify({ vs }),
    },
  });
  let docs = 0;
  if (Array.isArray(b.docs)) {
    for (const d of b.docs.slice(0, 6)) {
      if (!d || !d.data || !d.name) continue;
      try {
        const f = await storeDataUrl(app.id, d.data, d.name, 5 * 1024 * 1024);
        if (!f) continue;
        await prisma.document.create({ data: { applicationId: app.id, name: `${String(d.kind || 'document').slice(0, 30)}: ${f.name}`, path: f.path, mime: f.mime, size: f.size, uploadedBy: 'customer' } });
        docs++;
      } catch (e) {
        console.error('[apply] document', (e as Error).message);
      }
    }
  }
  try {
    await ensureToken(app);
    const steps = await stepsFor(app.service);
    if (steps[0]) await setStage(app.id, steps[0].id);
  } catch (e) {
    console.error('[apply] step setup', (e as Error).message);
  }
  notifyAdmin(
    `New Saudi visa application ${ref}`,
    `<h2 style="margin-top:0">New application on visit-saudi.ae</h2>${rowsTable([
      ['Reference', ref],
      ['Name', name],
      ['Visa', visaLabel(visa)],
      ['Nationality', nat],
      ['Email', email],
      ['Phone', phone],
      ['Entry', vs.entry || ''],
      ['Express', vs.express ? 'Yes' : 'No'],
      ['Documents', String(docs)],
    ])}`,
    email,
    'applications'
  );
  void notifyClient(app, 'welcome');
  void notifyTeam('teamApplication', { name, phone, email, service: app.service, ref }, app.id, { email: false });
  // signed in to the client dashboard (a team member testing in their own browser stays signed in as staff)
  if (acc.signIn) {
    const cur = await getSession().catch(() => null);
    if (!cur || !isStaff(cur.role)) await startSession(acc.user).catch(() => {});
  }
  let dashboard = '';
  try {
    dashboard = await fileLink(app);
  } catch {}
  return { status: 200, body: { ok: true, ref, dashboard, account: acc.account } };
}

type Full = Application & { documents: Document[]; messages: Message[]; payments: Payment[] };

/** Finds the application for the tracking page (reference + passport number, both upper-case) */
export async function findTracked(refIn: unknown, passIn: unknown): Promise<Full | null> {
  const ref = String(refIn || '').toUpperCase().trim();
  const pass = String(passIn || '').toUpperCase().trim();
  if (!ref || !pass) return null;
  const a = await prisma.application.findUnique({ where: { refNo: ref }, include: { documents: true, messages: { orderBy: { createdAt: 'asc' } }, payments: { orderBy: { createdAt: 'asc' } } } });
  if (!a || String(a.passportNo || '').toUpperCase() !== pass) return null;
  return a;
}

/** Step names, current step number and dated history in the tracking page's format */
export async function trackView(a: Full) {
  const steps = await stepsFor(a.service);
  const cur = currentStageId(a, steps);
  const stage = Math.max(0, steps.findIndex((s) => s.id === cur));
  const dates = stageDatesOf(a);
  const vs = vsOf(a);
  // notes the team wrote for the client, by step number (old files keep their own history)
  const notes = new Map<number, string>();
  for (const h of vs.history || []) if (h.clientNote) notes.set(h.stage, h.clientNote);
  const history = steps
    .map((s, i) => ({ stage: i, at: dates[s.id] || '', note: notes.get(i) || '' }))
    .filter((h) => h.at && h.stage <= stage);
  if (!history.length) history.push({ stage: 0, at: a.createdAt.toISOString(), note: '' });
  const messages = a.messages
    .filter((m) => m.channel !== 'internal')
    .map((m) => ({ from: m.fromAdmin ? 'team' : 'client', text: m.body, at: m.createdAt.toISOString() }));
  return { stages: steps.map((s) => s.name), stage, history, messages, vs };
}

/** Website visits and funnel events (Admin → Website stats) */
export async function logEvent(t: string, data: { path?: string; lang?: string; nat?: string }) {
  try {
    await prisma.vsEvent.create({ data: { t, path: (data.path || '').slice(0, 120), lang: (data.lang || '').slice(0, 5), nat: (data.nat || '').slice(0, 60), day: new Date().toISOString().slice(0, 10) } });
  } catch {
    /* stats are best effort */
  }
}
export async function logView(pathname: string) {
  if (pathname.startsWith('/assets/') || pathname.startsWith('/i18n/') || /\.[a-z0-9]{2,5}$/i.test(pathname)) return;
  const m = pathname.match(/^\/(ar|ru|de|es|fr|tr|zh|ur|hi|it|ro|pt|pl|hu|hr|sk|cs|id)(\/.*)?$/);
  await logEvent('view', { path: m ? m[2] || '/' : pathname, lang: m ? m[1] : 'en' });
}
