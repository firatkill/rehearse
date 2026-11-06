import ts from 'typescript';
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { messages as tr } from '@/messages/tr';
import { messages as en } from '@/messages/en-complete';
import { formatCount, formatNumber } from '@/lib/i18n/numbers';

// Explicit lexical/quotation exceptions: these are not second-person formal address.
const allowlist = new Set(['henüz', 'yalnız', 'yalnızca', 'deniz']);
const quotedExamples = ['“siz”', '‘siz’', '"siz"'];
const formalWords = new Set(
  'siz sizin sizi size sizde seçin yapıştırın tamamlayın deneyin edin ekleyin düzenleyin kaldırın oluşturun söyleyin kapatın başlayın konuşun geçirin yazın düşünün başlatın çalıştırın okuyun yanıtlayın görün getirin düzeltin kullanın açın bakın gönderin yapın yenileyin değiştirin'.split(
    ' ',
  ),
);
function formalAddress(text: string) {
  for (const quoted of quotedExamples) text = text.replaceAll(quoted, '');
  return (text.toLocaleLowerCase('tr-TR').match(/[a-zçğıöşü]+/gu) ?? []).filter(
    (word) =>
      !allowlist.has(word) &&
      (formalWords.has(word) ||
        /n[ıiuü]z(?:[ıiuü](?:n|n[ıiuü])?|d[ae](?:ki|n)?|l[ae]|[ae])?$/u.test(word)),
  );
}
it('TC-214 Turkish catalogue and prompts/mock fixtures consistently address sen', () => {
  for (const [key, text] of Object.entries(tr)) expect(formalAddress(text), key).toEqual([]);
  for (const path of [
    'lib/prompts/tr/feedback.ts',
    'lib/prompts/tr/summary.ts',
    'lib/prompts/tr/jobpost.ts',
    'lib/llm/mock-tr.ts',
    'lib/feedback/rubric-tr.ts',
  ]) {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest);
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      )
        expect(formalAddress(node.text), path).toEqual([]);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(formalAddress('Yanıtınızı gözden geçirin. Hazır olduğunuzda başlayın.')).toHaveLength(4);
  expect(formalAddress('Alıntıda “siz” yazıyor. Henüz deniz görünmüyor.')).toEqual([]);
});
it('TC-214 owner wording, roles and preserved English labels', () => {
  expect(tr['components.report.report.view.7']).toBe(
    'Puanlarına göre bir dil modeli tarafından yazıldı.',
  );
  expect(tr['ui.template.5']).toBe('{v0} üzerine çalış');
  expect(tr['markdown.seed']).toBe('Soru seti kodu');
  expect(tr['components.setup.voice.picker.3']).toBe('Ses');
  expect(tr['components.setup.setup.form.20']).toBe('Görüşmeci sesi ve hızı');
  for (const [role, label] of [
    ['frontend', 'Frontend'],
    ['backend', 'Backend'],
    ['full-stack', 'Full-stack'],
  ] as const)
    expect(tr[`labels.role.${role}`]).toBe(label);
  expect(en['dialog.close']).toBe('Close');
});
it('TC-215 number formatting uses explicit session locale and keeps English output', () => {
  expect(formatNumber(3.8, 'tr', 1)).toBe('3,8');
  expect(formatNumber(3, 'tr', 1)).toBe('3,0');
  expect(formatNumber(12345, 'tr')).toBe('12.345');
  expect(formatCount(4000, 'tr')).toBe('4.000');
  expect(formatCount(4000, 'en')).toBe('4,000');
  expect(formatNumber(4000, 'en')).toBe('4000');
  expect(formatNumber(3.8, 'en', 1)).toBe('3.8');
});
it('TC-214 pre-release question edits preserve ids and clarify the candidate/debugging context', () => {
  const read = (file: string) =>
    JSON.parse(readFileSync(file, 'utf8')) as Array<{ id: string; prompt: string }>;
  expect(
    read('content/questions-tr/behavioral.json').find((q) => q.id === 'beh-507')?.prompt,
  ).toContain('ürünle ilgili kendi görüşünün değiştiği');
  expect(
    read('content/questions-tr/technical-concepts.json').find((q) => q.id === 'tec-507')?.prompt,
  ).toContain('geliştiricinin sorunun nedenini bulmak için ihtiyaç duyduğu');
});
