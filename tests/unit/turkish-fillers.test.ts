import { expect, it } from 'vitest';
import { countFillers, fillerSpans } from '@/lib/metrics/fillers';
import { computeDelivery } from '@/lib/metrics/delivery';
import { answerMarks } from '@/lib/report/feedback-view';
import { feedback } from '../fixtures/api';
import { answer, record } from '../fixtures/records';
import { initialRoomState, roomReducer } from '@/lib/room/machine';
it.each([
  ['Şey, önce kayıtları inceledim.', { şey: 1 }],
  ['Yani, ııı, henüz karar vermedim.', { yani: 1, ııı: 1 }],
  ['Hani, eeee, bunu düşünüyordum.', { hani: 1, eee: 1 }],
  ['İŞTE, şey, sonra denedim.', { işte: 1, şey: 1 }],
  ['Yani yani denedim.', { yani: 2 }],
  ['Önce, şey, ıııı, kayıtları açtım.', { şey: 1, ııı: 1 }],
  ['😀 Şey, sonra eee devam ettim.', { şey: 1, eee: 1 }],
] satisfies [string, Record<string, number>][])(
  'TC-208 Turkish hesitation context: %s',
  (text, expected) => {
    expect(countFillers(text, undefined, 'tr').byPhrase).toEqual(expected);
    expect(countFillers(text, undefined, 'tr').total).toBe(
      Object.values(expected).reduce((a, b) => a + b, 0),
    );
    for (const span of fillerSpans(text, 'tr'))
      expect(text.slice(span.start, span.end).toLocaleLowerCase('tr-TR')).toMatch(
        /^(?:şey|yani|hani|işte|ı+|e+)$/iu,
      );
  },
);
it.each([
  'Bu işlem atomik, yani ya tamamı uygulanır ya da hiçbiri.',
  'İki servisi birleştirdim yani aynı işlemi tek yerde tuttum.',
  'Her şey yolundaydı. Bir şey değiştirmedim. Hiçbir şey kaybolmadı.',
  'Bu işte çalışırken çok şey öğrendim.',
  'İşte bu yüzden sürümü geri aldım.',
  'İşte, bu yüzden bekledik.',
  'Hani geçen hafta konuştuğumuz kayıt vardı ya, onu buldum.',
  'Hani, dün aynı soruyu sormuştun.',
  'Yani kelimesi burada bir açıklama bağlıyor.',
  'Şeytan ayrıntıda gizlidir. İşten çıktım. Hanife yanıtladı.',
  'III. sürüm tamamlandı. E-posta geldi.',
])('TC-208 meaningful Turkish words and substrings stay unmarked: %s', (text) => {
  expect(countFillers(text, undefined, 'tr')).toEqual({ total: 0, byPhrase: {} });
  expect(fillerSpans(text, 'tr')).toEqual([]);
});
it('TC-208 enabled phrases, Unicode offsets and language isolation', () => {
  expect(countFillers('Şey, eee, yani,', ['eee'], 'tr')).toEqual({
    total: 1,
    byPhrase: { eee: 1 },
  });
  expect(countFillers('Şey, eee,', [], 'tr').total).toBe(0);
  expect(countFillers('Şey, eee,').total).toBe(0);
  expect(countFillers('um, actually, like,', undefined, 'tr').total).toBe(0);
  expect(fillerSpans('S\u0327ey, eee', 'tr')).toEqual([]);
  expect(countFillers('', undefined, 'tr').total).toBe(0);
});
it('TC-208 metrics and transcript marks use the same chosen-language scan', () => {
  const value = {
    ...answer,
    mode: 'voice' as const,
    rawTranscript: 'Şey, eee, denedim.',
    transcript: 'Denedim.',
  };
  expect(computeDelivery(value, undefined, 'tr').fillers.total).toBe(2);
  expect(computeDelivery({ ...value, mode: 'text' }, undefined, 'tr').fillers.total).toBe(0);
  expect(
    answerMarks(value.rawTranscript, feedback, 'tr').filter((mark) => mark.kind === 'filler'),
  ).toHaveLength(2);
  const session = {
    ...record,
    setup: { ...record.setup, language: 'tr' as const, mode: 'text' as const },
  };
  const loaded = roomReducer(
    initialRoomState,
    { type: 'LOADED', session, answers: [] },
    Date.now(),
  );
  expect(loaded.session?.setup.language).toBe('tr');
  const reviewed = roomReducer(
    { ...loaded, mode: 'text', phase: { kind: 'answering', startedAt: 0, answerMode: 'text' } },
    { type: 'TEXT_REVIEW', transcript: value.rawTranscript },
    Date.now(),
  );
  expect(reviewed.answers[0]?.metrics.fillers.total).toBe(2);
  const edited = roomReducer(reviewed, { type: 'EDIT', transcript: 'Denedim.' }, Date.now());
  expect(edited.answers[0]?.metrics.fillers.total).toBe(0);
});
