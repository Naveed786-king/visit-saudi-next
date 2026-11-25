'use client';
import { Phone, CheckCheck, MessageSquare } from 'lucide-react';
import ResourceManager from './ResourceManager';
import { SocialIcon } from '@/components/ui/Icon';
import { LEAD_STATUSES, SERVICE_OPTIONS } from '@/lib/defaults';
import { formatDateTime } from '@/lib/utils';
import { api, toast, Btn } from './ui';

const STEPS = ['new', 'contacted', 'qualified', 'converted'];
const STEP_LABEL: Record<string, string> = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', converted: 'Converted', closed: 'Closed' };
const SOURCE_LABEL = (s?: string | null) => {
  const v = String(s || '').toLowerCase();
  if (v === 'chatbot') return 'Website chat';
  if (v === 'portal') return 'Client dashboard';
  if (v === 'website') return 'Contact form';
  if (v.includes('old app')) return 'Old website';
  return s || 'Website';
};

/** Where the lead stands: New → Contacted → Qualified → Converted (or Closed). Click a step to move it there. */
function LeadSteps({ row, reload }: { row: any; reload: () => void }) {
  const closed = row.status === 'closed';
  const at = Math.max(0, STEPS.indexOf(row.status));
  async function set(status: string) {
    if (status === row.status) return;
    try {
      await api(`/api/admin/leads/${row.id}`, 'PUT', { status, seen: true });
      toast(`Moved to ${STEP_LABEL[status]}`);
      reload();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  }
  return (
    <div className="min-w-[230px]">
      <div className="flex items-center">
        {STEPS.map((st, i) => {
          const done = !closed && i <= at;
          return (
            <div key={st} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => set(st)}
                title={`Move to ${STEP_LABEL[st]}`}
                className={`grid h-6 w-6 place-items-center rounded-full text-[0.65rem] font-bold ring-2 transition ${done ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-gray-400 ring-gray-200 hover:ring-emerald-600'}`}
              >
                {i + 1}
              </button>
              {i < STEPS.length - 1 && <span className={`mx-1 h-0.5 flex-1 rounded ${!closed && i < at ? 'bg-emerald-700' : 'bg-gray-200'}`} />}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className={`text-xs font-bold ${closed ? 'text-gray-500' : 'text-emerald-800'}`}>
          {closed ? 'Closed' : `Step ${at + 1} of ${STEPS.length} · ${STEP_LABEL[STEPS[at]]}`}
        </span>
        <button type="button" onClick={() => set(closed ? 'new' : 'closed')} className="text-[0.7rem] font-semibold text-gray-400 underline hover:text-gray-700">
          {closed ? 'Reopen' : 'Close'}
        </button>
      </div>
    </div>
  );
}

/** The message, with the chat link as a button */
function LeadMessage({ text }: { text?: string | null }) {
  const raw = String(text || '');
  const m = raw.match(/Chat:\s*(\/admin\/chatbot\?chat=[A-Za-z0-9_-]+)/);
  const clean = raw.replace(/\s*Chat:\s*\/admin\/chatbot\?chat=[A-Za-z0-9_-]+/, '').trim();
  return (
    <div className="max-w-sm">
      <p className="line-clamp-2 whitespace-pre-line text-gray-600">{clean || '—'}</p>
      {m && (
        <a href={m[1]} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline">
          <MessageSquare className="h-3.5 w-3.5" /> Open the chat
        </a>
      )}
    </div>
  );
}

export default function LeadsManager() {
  async function markAll() {
    const d = await api<{ items: any[] }>('/api/admin/leads?take=200');
    await Promise.all(d.items.filter((l) => !l.seen).map((l) => api(`/api/admin/leads/${l.id}`, 'PUT', { seen: true })));
    toast('All leads marked as seen');
    window.location.reload();
  }
  return (
    <ResourceManager
      config={{
        resource: 'leads',
        title: 'Leads & enquiries',
        subtitle: 'Every contact form, quick enquiry and consultation request. New leads appear here instantly.',
        singular: 'Lead',
        exportType: 'leads',
        defaults: { status: 'new', seen: true },
        actions: (
          <Btn variant="outline" onClick={markAll}>
            <CheckCheck className="h-4 w-4" /> Mark all seen
          </Btn>
        ),
        filters: [
          { key: 'status', label: 'Statuses', options: LEAD_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })) },
          { key: 'service', label: 'Services', options: SERVICE_OPTIONS.map((s) => ({ value: s, label: s })) },
        ],
        transformBeforeEdit: (r) => {
          if (!r.seen) api(`/api/admin/leads/${r.id}`, 'PUT', { seen: true }).catch(() => {});
          return { ...r, seen: true };
        },
        fields: [
          { name: 'name', label: 'Name', type: 'text' },
          { name: 'phone', label: 'Phone', type: 'text' },
          { name: 'email', label: 'Email', type: 'text' },
          { name: 'nationality', label: 'Nationality', type: 'text' },
          { name: 'service', label: 'Service', type: 'select', options: SERVICE_OPTIONS.map((s) => ({ value: s, label: s })) },
          { name: 'message', label: 'Message', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: LEAD_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })) },
          { name: 'notes', label: 'Internal notes (not visible to client)', type: 'textarea' },
          { name: 'source', label: 'Source page', type: 'text' },
        ],
        columns: [
          {
            key: 'name',
            label: 'Contact',
            render: (r) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {r.name} {!r.seen && <span className="ml-1 rounded bg-red-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">NEW</span>}
                </p>
                <p className="text-xs text-gray-500">{[r.phone, r.email].filter(Boolean).join(' · ')}</p>
                <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold text-amber-800 ring-1 ring-amber-200">{SOURCE_LABEL(r.source)}</span>
              </div>
            ),
          },
          { key: 'service', label: 'Service', className: 'hidden md:table-cell', render: (r) => <span className="text-gray-600">{r.service || '—'}</span> },
          { key: 'message', label: 'Message', className: 'hidden md:table-cell', render: (r) => <LeadMessage text={r.message} /> },
          { key: 'status', label: 'Step', render: (r, reload) => <LeadSteps row={r} reload={reload} /> },
          { key: 'createdAt', label: 'Received', className: 'hidden lg:table-cell', render: (r) => <span className="text-xs text-gray-500">{formatDateTime(r.createdAt)}</span> },
        ],
        extraActions: (r) => (
          <>
            {r.phone && (
              <a href={`https://wa.me/${String(r.phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg p-2 text-[#25D366] hover:bg-green-50" title="WhatsApp">
                <SocialIcon name="whatsapp" className="h-4 w-4" />
              </a>
            )}
            {r.phone && (
              <a href={`tel:${r.phone}`} className="inline-flex rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800" title="Call">
                <Phone className="h-4 w-4" />
              </a>
            )}
          </>
        ),
      }}
    />
  );
}
