// Chatbot settings (Setting key "chatbot"). Keys are masked for the browser like the publisher's.
import { prisma } from '@/lib/db';
import { deepMerge, maskSecrets, unmaskSecrets } from '@/lib/autopublisher/pure';
import type { ProviderId } from '@/lib/autopublisher/config';

export const GREETINGS: Record<string, string> = {
  en: 'Assalamu alaikum 👋 I can help with Saudi visas: which visa fits your passport, documents, costs, Umrah and tracking. How can I help?',
  ar: 'السلام عليكم 👋 يمكنني مساعدتك في تأشيرات السعودية: التأشيرة المناسبة لجوازك، المستندات، التكاليف، العمرة وتتبع الطلب. كيف أساعدك؟',
  ru: 'Ассаляму алейкум 👋 Помогу с визами в Саудовскую Аравию: какая виза подходит вашему паспорту, документы, стоимость, умра и отслеживание. Чем помочь?',
  de: 'Assalamu alaikum 👋 Ich helfe bei Saudi-Visa: welches Visum zu Ihrem Pass passt, Unterlagen, Kosten, Umrah und Statusverfolgung. Wie kann ich helfen?',
  es: 'Assalamu alaikum 👋 Te ayudo con los visados de Arabia Saudí: qué visado corresponde a tu pasaporte, documentos, costes, Umrah y seguimiento. ¿En qué te ayudo?',
  fr: 'Assalamu alaikum 👋 Je vous aide pour les visas saoudiens : quel visa pour votre passeport, documents, coûts, Omra et suivi. Comment puis-je vous aider ?',
  tr: 'Esselamün aleyküm 👋 Suudi vizeleri konusunda yardımcı olurum: pasaportunuza uygun vize, belgeler, ücretler, Umre ve başvuru takibi. Nasıl yardımcı olabilirim?',
  zh: '您好 👋 我可以帮您了解沙特签证：适合您护照的签证、所需材料、费用、副朝及申请进度查询。请问有什么可以帮您？',
  ur: 'السلام علیکم 👋 میں سعودی ویزوں میں مدد کر سکتا ہوں: آپ کے پاسپورٹ کے لیے کون سا ویزا، دستاویزات، اخراجات، عمرہ اور درخواست کی ٹریکنگ۔ میں کیسے مدد کروں؟',
  hi: 'अस्सलामु अलैकुम 👋 मैं सऊदी वीज़ा में मदद कर सकता हूँ: आपके पासपोर्ट के लिए सही वीज़ा, दस्तावेज़, खर्च, उमरा और आवेदन की ट्रैकिंग। मैं कैसे मदद करूँ?',
  it: 'Assalamu alaikum 👋 Ti aiuto con i visti per l’Arabia Saudita: quale visto per il tuo passaporto, documenti, costi, Umrah e monitoraggio. Come posso aiutarti?',
  ro: 'Assalamu alaikum 👋 Vă ajut cu vizele pentru Arabia Saudită: ce viză se potrivește pașaportului, acte, costuri, Umrah și urmărirea cererii. Cu ce vă pot ajuta?',
  pt: 'Assalamu alaikum 👋 Ajudo com vistos para a Arábia Saudita: que visto serve ao seu passaporte, documentos, custos, Umrah e acompanhamento. Como posso ajudar?',
  pl: 'Assalamu alaikum 👋 Pomogę w sprawie wiz do Arabii Saudyjskiej: jaka wiza dla Twojego paszportu, dokumenty, koszty, umra i śledzenie wniosku. W czym pomóc?',
  hu: 'Assalamu alaikum 👋 Segítek a szaúdi vízumokkal: melyik vízum illik az útleveléhez, dokumentumok, költségek, umra és nyomon követés. Miben segíthetek?',
  hr: 'Assalamu alaikum 👋 Pomažem oko saudijskih viza: koja viza odgovara vašoj putovnici, dokumenti, troškovi, umra i praćenje zahtjeva. Kako mogu pomoći?',
  sk: 'Assalamu alaikum 👋 Pomôžem s vízami do Saudskej Arábie: aké vízum pre váš pas, doklady, náklady, umra a sledovanie žiadosti. Ako môžem pomôcť?',
  cs: 'Assalamu alaikum 👋 Pomohu s vízy do Saúdské Arábie: jaké vízum pro váš pas, doklady, náklady, umra a sledování žádosti. Jak mohu pomoci?',
  id: 'Assalamu alaikum 👋 Saya bisa membantu soal visa Arab Saudi: visa yang cocok untuk paspor Anda, dokumen, biaya, umrah, dan pelacakan permohonan. Ada yang bisa dibantu?',
};

export type ChatConfig = {
  enabled: boolean;
  provider: ProviderId;
  model: string;
  key: string; // own key; empty = use the Auto Publisher / environment key for this provider
  botName: string;
  role: string; // shown under the name, e.g. "Saudi visa advisor"
  avatar: string; // picture next to the chat; empty = built-in advisor picture
  greetings: Record<string, string>;
  color: string;
  position: 'end' | 'start'; // right / left in left-to-right languages
  whatsapp: string; // empty = site WhatsApp number
  handover: { apply: boolean; quote: boolean; unknown: boolean; human: boolean; askContact: boolean };
  maxRepliesPerDay: number;
  maxMessagesPerChat: number;
  deleteAfterDays: number;
  extraRules: string;
};

export const DEFAULT_CHAT: ChatConfig = {
  enabled: false,
  provider: 'gemini',
  model: 'gemini-3.8-flash',
  key: '',
  botName: 'Sara',
  role: 'Saudi visa advisor',
  avatar: '',
  greetings: GREETINGS,
  color: '#0a5c36',
  position: 'end',
  whatsapp: '',
  handover: { apply: true, quote: true, unknown: true, human: true, askContact: true },
  maxRepliesPerDay: 500,
  maxMessagesPerChat: 30,
  deleteAfterDays: 180,
  extraRules: '',
};

const KEY = 'chatbot';

export async function getChatConfig(): Promise<ChatConfig> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    return deepMerge(DEFAULT_CHAT, row ? JSON.parse(row.value) : {});
  } catch {
    return DEFAULT_CHAT;
  }
}

export async function saveChatConfig(incoming: Partial<ChatConfig>): Promise<ChatConfig> {
  const cur = await getChatConfig();
  const next = deepMerge(cur, unmaskSecrets(incoming || {}, cur));
  const n = (v: any, d: number, a: number, b: number) => Math.min(b, Math.max(a, Math.round(Number.isFinite(Number(v)) ? Number(v) : d)));
  next.maxRepliesPerDay = n(next.maxRepliesPerDay, 500, 0, 100000);
  next.maxMessagesPerChat = n(next.maxMessagesPerChat, 30, 2, 200);
  next.deleteAfterDays = n(next.deleteAfterDays, 180, 0, 3650);
  next.color = /^#[0-9a-f]{3,8}$/i.test(next.color) ? next.color : DEFAULT_CHAT.color;
  next.position = next.position === 'start' ? 'start' : 'end';
  next.botName = String(next.botName || DEFAULT_CHAT.botName).slice(0, 60);
  next.role = String(next.role ?? DEFAULT_CHAT.role).slice(0, 60);
  next.avatar = /^(\/|https:\/\/)[^\s"'<>]*$/.test(String(next.avatar || '')) ? String(next.avatar) : '';
  next.extraRules = String(next.extraRules || '').slice(0, 4000);
  next.whatsapp = String(next.whatsapp || '').replace(/[^\d+]/g, '');
  for (const k of Object.keys(next.greetings || {})) next.greetings[k] = String(next.greetings[k] || '').slice(0, 400);
  const value = JSON.stringify(next);
  await prisma.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  return next;
}

export const publicChatConfig = (c: ChatConfig) => maskSecrets(c);

/** What the website widget needs (no secrets) */
export function widgetConfig(c: ChatConfig, locale: string) {
  return { botName: c.botName, role: c.role || '', avatar: c.avatar || '/brand/advisor.svg', greeting: c.greetings?.[locale] || GREETINGS[locale] || c.greetings?.en || GREETINGS.en, color: c.color, position: c.position };
}
