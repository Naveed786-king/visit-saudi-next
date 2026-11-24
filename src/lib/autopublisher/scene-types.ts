// Kinds of picture the blog can use. Every picture in an article gets a DIFFERENT kind, picked by
// what its title or section is about, and kinds used for recent pictures are pushed back, so the blog
// does not show the same desk-with-a-passport photo again and again.

export type SceneType = { id: string; words: RegExp; brief: string; people: boolean };

export const SCENE_TYPES: SceneType[] = [
  { id: 'desk', people: false, words: /\b(document|requirement|checklist|paper|apply|application|form|eligib|criteria|prepare|photo)/i, brief: 'a premium desk still life: a passport in a plain dark leather holder, a printed itinerary folder (closed), a small travel camera and a fountain pen on light stone, the Dubai skyline softly behind a large window' },
  { id: 'consult', people: true, words: /\b(consult|advice|advis|help|mistake|myth|question|explain|process|step|guide|how to|specialist)/i, brief: 'a friendly visa specialist in smart modest clothes talking with a traveller across a clean desk in a bright modern Dubai office (nothing held in the hands), the city through floor-to-ceiling windows' },
  { id: 'airport', people: true, words: /\b(travel|entry|enter|arriv|flight|airport|immigration|border|land|transit|stopover|layover)/i, brief: 'travellers seen from behind pushing suitcases on a trolley through a bright, modern Saudi airport terminal hall with tall glass walls and palm planters (no signs or screens readable)' },
  { id: 'family', people: true, words: /\b(family|families|spouse|wife|husband|child|children|kid|sponsor|host|relative|parent|mother|father|friends)/i, brief: 'a family with young children, dressed modestly, arriving with suitcases and greeting relatives in a bright, modern Saudi home entrance, warm daylight, faces partly turned away' },
  { id: 'pilgrim', people: true, words: /\b(umrah|umra|hajj|pilgrim|nusuk|madinah|medina|makkah|mecca|rawdah|ihram)/i, brief: 'pilgrims in white ihram seen from behind walking along a wide sunlit plaza with modern arcades in Madinah at golden hour, peaceful and respectful (no close-up faces, no Kaaba, no text)' },
  { id: 'business', people: true, words: /\b(business|company|meeting|conference|invitation|trade|exhibition|investor|entrepreneur|partner)/i, brief: 'business visitors in smart clothes walking through the modern King Abdullah Financial District in Riyadh, glass towers and shaded walkways, natural movement, seen from the side' },
  { id: 'medical', people: false, words: /\b(medical|health|insurance|treatment|doctor|nurse|clinic|hospital)/i, brief: 'a clean, bright modern hospital corridor in Saudi Arabia with soft daylight and plants, no signs or screens' },
  { id: 'service-hall', people: true, words: /\b(biometric|renew|cancel|stamp|status|track|government|approval|reject|decision|processing)/i, brief: 'a calm, bright modern service centre hall with a few people waiting on designer seats, no signs or screens' },
  { id: 'time', people: false, words: /\b(timeline|how long|days|weeks|month|expir|validity|valid|deadline|period|duration|express|urgent)/i, brief: 'an elegant brass hourglass and a closed leather travel diary on a desk by a window with soft desert light' },
  { id: 'alula', people: true, words: /\b(alula|al-ula|hegra|madain|elephant rock|nabataean|heritage|unesco|history|ancient)/i, brief: 'a traveller seen from behind standing before the sandstone rock formations and Nabataean tombs of Hegra near AlUla at golden hour, vast desert light' },
  { id: 'riyadh', people: true, words: /\b(riyadh|capital|diriyah|boulevard|kingdom centre|city break|nightlife|events|season)/i, brief: 'people strolling in the restored mud-brick lanes of Diriyah (At-Turaif) on the edge of Riyadh at dusk, warm lanterns, modern Riyadh skyline far behind' },
  { id: 'jeddah', people: true, words: /\b(jeddah|red sea|corniche|al-balad|coast|beach|diving|island)/i, brief: 'a calm evening on the Jeddah Corniche by the Red Sea: families walking along the waterfront promenade with palm trees, seen from behind, soft sunset light' },
  { id: 'desert', people: false, words: /\b(desert|dune|empty quarter|camping|camel|nature|mountain|abha|asir|taif|hiking|landscape|road trip|drive|driving)/i, brief: 'a sweeping Saudi landscape: red sand dunes and a lone 4x4 track at sunrise, or the green terraced mountains of Asir under clouds, photographed wide' },
  { id: 'gcc-resident', people: true, words: /\b(uae|dubai|abu dhabi|gcc|resident|residency|emirates|qatar|kuwait|bahrain|oman)/i, brief: 'a traveller seen from behind with a small suitcase on the Dubai Marina promenade in the early morning, ready for a trip, date palms and towers softly behind' },
  { id: 'skyline-flight', people: false, words: /\b(passport|visa-free|world|global|countries|nationalit|eligible|flight|airline|saudia|flynas)/i, brief: 'an airliner climbing over a desert city skyline at golden hour, photographed from the ground across the city (outdoor, no windows or interiors, no airline logos)' },
  // only used as the backdrop behind a drawn cover graphic (never picked by words)
  { id: 'flag-skyline', people: false, words: /(?!)/, brief: 'the Riyadh skyline with the Kingdom Centre tower at golden hour seen across a wide boulevard lined with date palms, open sky in the middle of the frame (no flags, no text)' },
  { id: 'cost', people: false, words: /\b(cost|fee|price|pay|budget|afford|cheap|expens|charge|sar|riyal|usd)/i, brief: 'a neat flat lay of a closed leather wallet, a plain leather passport holder and a folded paper map on a light stone desk, sunlight (no money notes, no numbers)' },
];

const byId = new Map(SCENE_TYPES.map((t) => [t.id, t]));
export const sceneType = (id?: string) => (id ? byId.get(id) : undefined);

/** Small stable number from a string (so the same article gets the same choice when retried) */
function jitter(seed: number, id: string) {
  let h = seed | 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 100) / 100;
}

/**
 * For each picture of an article (texts[i] = its title or section), an ordered list of 3 scene kinds:
 * the best fit first, then two backups for retries. The first choices are all different from each
 * other, and kinds used for the blog's recent pictures (newest first in `recent`) are pushed back.
 */
export function pickSceneTypes(texts: string[], recent: string[], seed: number): string[][] {
  const used = new Set<string>();
  return texts.map((text, i) => {
    const scored = SCENE_TYPES.map((t) => {
      const hits = (String(text).match(new RegExp(t.words.source, 'gi')) || []).length;
      const age = recent.indexOf(t.id);
      const recency = age === -1 ? 0 : age < 4 ? 5 : age < 10 ? 2.5 : 1;
      return { id: t.id, s: Math.min(hits, 3) * 3 - recency + jitter(seed + i * 17, t.id) * 1.5 - (used.has(t.id) ? 100 : 0) };
    }).sort((a, b) => b.s - a.s);
    const pick = scored.slice(0, 3).map((x) => x.id);
    used.add(pick[0]);
    return pick;
  });
}
