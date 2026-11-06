import 'server-only';
import { LANGUAGE_LOCALES } from '@/lib/config';
import { ANSWER, DIMENSIONS, FEEDBACK_LIMITS, JOBPOST, type Dimension } from '@/lib/config';
import { DIMENSION_LABELS_TR, DIMENSION_TIPS_TR } from '@/lib/feedback/rubric-tr';
import { countWords, tokenize } from '@/lib/metrics/words';
function block(prompt: string, tag: string) {
  return prompt.split(`<${tag}>`)[1]?.split(`</${tag}>`)[0]?.trim() ?? '';
}
function field(text: string, key: string) {
  return (
    text
      .split('\n')
      .find((line) => line.startsWith(`${key}: `))
      ?.slice(key.length + 2) ?? ''
  );
}
const rationales: Record<Dimension, string> = {
  structure: 'Yanıtın bağlam, eylem ve sonuç bağlantısını bu düzeyde kuruyorsun.',
  specificity: 'Verdiğin somut ayrıntılar, iddianın sınırlarını görmeyi sağlıyor.',
  ownership: 'Kendi katkını ve kararlarını anlatımında bu ölçüde ayırıyorsun.',
  impact: 'Eylemlerinin sonucunu bu ölçüde gözlenebilir hâle getiriyorsun.',
  relevance: 'Yanıtındaki ayrıntılar, sorunun istediği konuya bu ölçüde bağlanıyor.',
  clarity: 'Cümlelerin ve örneğinin sırası, dinleyenin ana noktayı takip etmesini sağlıyor.',
};
/** A deterministic development stand-in, never evidence of live Turkish model quality. */
export function mockFeedbackTr(prompt: string, transcript: string) {
  const text = transcript.toLocaleLowerCase(LANGUAGE_LOCALES.tr);
  const words = countWords(text);
  const short = !block(prompt, 'follow_up_question') && words < ANSWER.SHORT_WORDS;
  const injection =
    /talimatları (yok say|unut)|kuralları (yok say|unut|değiştir)|sistem (mesajı|istemini|metnini)|tam puan ver|bana 4 ver|ignore.*instructions|system prompt/u.test(
      text,
    );
  const context = /geçen|ekib|proje|çalış|uygulama|tasarım|sistem/u.test(text);
  const personal = tokenize(transcript).filter((token) =>
    /(?:dım|dim|dum|düm|tım|tim|tum|tüm|yorum|acağım|eceğim|arım|erim)$/u.test(
      token.w.toLocaleLowerCase(LANGUAGE_LOCALES.tr),
    ),
  ).length;
  const action = /tasarla|ölç|incele|yazd|kurdu|seç|ekle|değiştir|sına|kontrol|dened|uygula/u.test(
    text,
  );
  const result = /sonuç|azal|düştü|arttı|doğrula|ölç|engelle|kaldı|kazanç/u.test(text);
  const numbers = text.match(/\d+/g)?.length ?? 0;
  const questionWords = tokenize(field(block(prompt, 'question'), 'prompt'))
    .map((t) => t.w.toLocaleLowerCase(LANGUAGE_LOCALES.tr).slice(0, 5))
    .filter((w) => w.length >= 5);
  const share = questionWords.length
    ? questionWords.filter((w) => text.includes(w)).length / questionWords.length
    : 0;
  const relevance = share >= 0.25 ? 4 : share >= 0.15 ? 3 : share >= 0.05 ? 2 : 1;
  const offTopic = relevance === 1 && !short;
  const scores: Record<Dimension, number> = {
    structure: 1 + Number(context) + Number(action) + Number(result),
    specificity: numbers === 0 ? 1 : numbers === 1 ? 2 : numbers < 4 ? 3 : 4,
    ownership: personal === 0 ? 1 : personal === 1 ? 2 : personal < 4 ? 3 : 4,
    impact: !result ? 1 : numbers === 0 ? 2 : numbers === 1 ? 3 : 4,
    relevance,
    clarity:
      words < ANSWER.SHORT_WORDS
        ? 2
        : words / Math.max(1, text.split(/[.!?]/).filter((v) => countWords(v) > 0).length) <= 22
          ? 4
          : 3,
  };
  if (injection)
    for (const dimension of DIMENSIONS) scores[dimension] = Math.min(scores[dimension], 2);
  const effective = (dimension: Dimension) =>
    offTopic
      ? dimension === 'relevance'
        ? 1
        : Math.min(scores[dimension], FEEDBACK_LIMITS.CAPPED_MAX_SCORE)
      : short && ['structure', 'specificity', 'impact'].includes(dimension)
        ? Math.min(scores[dimension], FEEDBACK_LIMITS.CAPPED_MAX_SCORE)
        : scores[dimension];
  const lowest = DIMENSIONS.reduce(
    (low, d) => (effective(d) < effective(low) ? d : low),
    DIMENSIONS[0],
  );
  return {
    scores: Object.fromEntries(
      DIMENSIONS.map((d) => [d, { score: scores[d], rationale: rationales[d] }]),
    ),
    strengths: [
      {
        point: 'Yanıtında ele alınabilecek bir deneyim veya yaklaşım var.',
        evidence: injection ? '' : transcript.trim().split(/\s+/).slice(0, 8).join(' '),
      },
    ],
    improvements: [
      {
        dimension: lowest,
        vague_phrases: [],
        point: `${DIMENSION_LABELS_TR[lowest]} boyutunu somut bir ayrıntıyla güçlendir.`,
        why: 'Dinleyen, hangi kararı neden aldığını ve sonucunu daha kolay takip eder.',
        rewrite:
          'Ben [yaptığım değişiklik] ile [ölçüm] değerini [önce] düzeyinden [sonra] düzeyine getirdim.',
      },
    ],
    follow_up_question: 'Bu kararı verirken hangi alternatifi eledin ve neden?',
    model_answer_outline: [
      'Bağlamı ve çözmek istediğin sorunu kısaca açıkla.',
      'Kendi kararını, gerekçeni ve dikkate aldığın kısıtı belirt.',
      'Sonucu nasıl ölçtüğünü veya kontrol edeceğini anlat.',
    ],
    flags: { too_short: short, off_topic: offTopic, injection_suspected: injection },
  };
}
export function mockSummaryTr(prompt: string) {
  const session = block(prompt, 'session');
  const means = field(session, 'dimension_means');
  const ranked = [...DIMENSIONS].sort(
    (a, b) =>
      Number(means.match(new RegExp(`${b}=([0-9.]+)`))?.[1] ?? 0) -
      Number(means.match(new RegExp(`${a}=([0-9.]+)`))?.[1] ?? 0),
  );
  const focus = field(session, 'focus_areas')
    .split(',')
    .flatMap((value) => DIMENSIONS.filter((d) => d === value.trim()));
  const first = focus[0] ?? DIMENSIONS[0];
  return {
    headline: `En güçlü alanın ${DIMENSION_LABELS_TR[ranked[0] ?? DIMENSIONS[0]]}; şimdi ${DIMENSION_LABELS_TR[first]} üzerine çalış.`,
    paragraph:
      'Puanlar, yanıtlarında kullanabileceğin güçlü yönleri ve geliştirebileceğin alanları gösteriyor. Sonraki alıştırmada bir kararını gerekçesi ve gözlenebilir sonucuyla anlatmayı dene.',
    focus_notes: focus.map((dimension) => ({ dimension, note: DIMENSION_TIPS_TR[dimension] })),
    next_practice: `Aynı soru türleriyle yeni bir oturum aç ve ${DIMENSION_LABELS_TR[first]} boyutuna odaklan.`,
  };
}
const jobTemplates = [
  'Bu sorumluluk için en önemli hata senaryolarını nasıl sınardın?',
  'Bu alanda ekiple tartışacağın bir ödünleşimi ve seçimini anlatır mısın?',
  'Bu işle ilgili bir üretim ortamı sorununu nasıl teşhis ederdin?',
  'İlk teslimatının kullanıcılara yarar sağladığını hangi sonuçlar gösterirdi?',
  'Bu gereksinimi netleştirmek için çalışma arkadaşlarınla nasıl ilerlerdin?',
  'Burada çözüm tasarlamadan önce hangi sınırları belirlerdin?',
  'Rolün bu kısmı neden ilgini çekiyor ve ilk neyi öğrenirdin?',
  'İlerlemeyi ve riski teknik olmayan bir paydaşa nasıl açıklardın?',
  'Bu akış için en küçük faydalı değişikliği nasıl önceliklendirirdin?',
  'Bir uygulama yaklaşımı seçmeden önce hangi kanıtları toplardın?',
  'Varsayımın yanlış çıkarsa yayını nasıl geri alınabilir tutardın?',
  'Bu değişiklikten sonra hangi operasyonel göstergeleri izlerdin?',
  'Başkalarının sürdüreceği bir kararı nasıl belgelerdin?',
  'Bu sorumlulukta erişilebilirliği hangi kullanıcı senaryolarıyla değerlendirirdin?',
  'Beklenmedik bir yük artışında hangi davranışı önce korurdun?',
  'Bu gereksinim değişirse mevcut kullanıcıları nasıl haberdar ederdin?',
];
export function mockJobpostTr(prompt: string) {
  const text = block(prompt, 'job_post');
  const existing = block(prompt, 'existing_questions').split('\n').filter(Boolean);
  const count = Number(prompt.match(/^(\d+) soru/)?.[1] ?? JOBPOST.INITIAL_QUESTIONS);
  const quotes = text
    .split(/(?<=[.!?])\s+|\n/u)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length >= JOBPOST.MIN_QUOTE_CHARS &&
        countWords(s) >= JOBPOST.MIN_QUOTE_WORDS &&
        !/talimat|sistem mesaj|sırları|yok say|ignore|instruction|secret|canary/iu.test(s),
    );
  const quote = quotes[0] ?? text.slice(0, 120);
  return {
    role: 'Yazılım mühendisi',
    company: '',
    location: '',
    about: '',
    requirements: quotes.slice(0, 8).map((s) => s.slice(0, 250)),
    questions: Array.from({ length: count }, (_, index) => ({
      text: jobTemplates[(existing.length + index) % jobTemplates.length],
      type: JOBPOST.QUESTION_TYPES[(existing.length + index) % JOBPOST.QUESTION_TYPES.length],
      groundingQuote: (quotes[index % quotes.length] ?? quote).slice(0, 1000),
      listenFor: [
        'Somut kişisel katkısını açıklaması',
        'İlgili bir kısıt ve ödünleşim belirtmesi',
        'Gözlenebilir bir sonucu veya ölçümü kontrol etmesi',
      ],
    })),
  };
}
