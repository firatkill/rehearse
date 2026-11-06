import { DIMENSIONS, type Dimension, type QuestionType } from '@/lib/config';
export const DIMENSION_LABELS_TR: Record<Dimension, string> = {
  structure: 'Yapı',
  specificity: 'Somutluk',
  ownership: 'Sorumluluk alma',
  impact: 'Etki',
  relevance: 'Soruyla ilgililik',
  clarity: 'Anlaşılırlık',
};
type Anchors = readonly [string, string, string, string];
type RubricEntry = { question: string; anchors: Record<QuestionType, Anchors> };
const specificity: Anchors = [
  'Yalnızca genel ifadeler var; herhangi bir kişiyi veya sistemi anlatıyor olabilir.',
  'Bazı somut ayrıntılar var ama temel bilgiler belirsiz: örneğin büyük bir proje ya da yavaş bir sistem.',
  'Çoğu iddia somut ayrıntılarla destekleniyor: sistemler, araçlar, kısıtlar veya sayılar belirtilmiş.',
  'Yanıt boyunca gereksiz uzatmadan kesin ayrıntılar veriliyor: sayılar, sistemler, kısıtlar ve ölçek.',
];
const technicalOwnership: Anchors = [
  'Bir tercih belirtmeden tanımları tekrarlıyor veya her konuda çekimser kalıyor.',
  'Bir tercih belirtiyor ama gerekçesini açıklamıyor ya da kendi deneyimiyle ilişkilendirmiyor.',
  'Tercihlerini gerekçelendiriyor ve en az bir kez kendi deneyimine değiniyor.',
  'Gerekçeli bir öneri sunuyor, hangi koşullarda başka bir seçim yapacağını söylüyor ve kendi deneyiminden yararlanıyor.',
];
const technicalImpact: Anchors = [
  'Seçimlerin sonuçları ele alınmıyor.',
  'Fayda veya maliyetlerden genel ifadelerle söz ediliyor.',
  'Seçimlerin performans, maliyet, kullanıcı deneyimi veya bakım üzerindeki somut sonuçları açıklanıyor.',
  'Sonuçlar sayılarla veya sınırlarla tanımlanıyor ve kullanıcılarla ya da iş hedefleriyle ilişkilendiriliyor.',
];
const relevance: Anchors = [
  'Sorulan soruyu yanıtlamıyor.',
  'Soruyu kısmen yanıtlıyor; yanıtın büyük bölümü konudan uzak.',
  'Soruyu yanıtlıyor ama yer yer konudan sapıyor.',
  'Soruyu tam olarak, belirtilen rol ve kıdem seviyesine uygun biçimde yanıtlıyor.',
];
const clarity: Anchors = [
  'Takip etmek zor: konu dağılıyor, ifadeler kopuk veya birbiriyle çelişiyor.',
  'Çabayla anlaşılabiliyor; tekrarlar veya dolgu ifadeleri asıl noktayı gizliyor.',
  'Açık bir yanıt; küçük sapmalar veya anlaşılması zor bir bölüm var.',
  'Kısa, düzenli ve ilk dinleyişte anlaşılır; gereksiz tekrar yok.',
];
export const RUBRIC_TR: Record<Dimension, RubricEntry> = {
  structure: {
    question: 'Yanıt, dinleyenin takip edebileceği şekilde düzenlenmiş mi?',
    anchors: {
      behavioral: [
        'Belirgin bir durum, görev, eylem veya sonuç yok; olaylar sırasız ya da hikâye yerine genel bir görüş anlatılıyor.',
        'Durum, görev, eylem ve sonuç bölümlerinden yalnızca biri veya ikisi var; eylem ya da sonuç eksik veya ima ediliyor.',
        'Dört bölüm de var ancak biri yüzeysel, çoğunlukla sonuç; ya da sıralama takibi zorlaştırıyor.',
        'Durum ve görev birkaç cümlede kuruluyor, ağırlık eylemlerde, sonuç açıkça belirtiliyor; takip etmek kolay.',
      ],
      'technical-concepts': [
        'Açık bir tanım veya açıklama yok; ifadeler dağınık.',
        'Kavramı tanımlıyor ama nasıl çalıştığını veya ne zaman kullanılacağını açıklamıyor.',
        'Tanımı, işleyişi ve kullanım alanını açıklıyor; bir örnek veya ödünleşimler eksik.',
        'Mantıklı bir sırayla tanımı, işleyişi, somut bir örneği ve ödünleşimleri veya sınırları açıklıyor.',
      ],
      'system-design-lite': [
        'Gereksinimleri veya bileşenleri açıklamadan doğrudan teknolojilere atlıyor.',
        'Gereksinimleri veya veri akışını netleştirmeden bileşenleri sıralıyor.',
        'Temel gereksinimleri, ana bileşenleri ve veri akışını açıklıyor; ödünleşimler yüzeysel.',
        'Gereksinimleri ve ölçeği netleştiriyor, bileşenleri ve veri akışını anlatıyor; en az iki ödünleşimi veya hata senaryosunu ele alıyor.',
      ],
    },
  },
  specificity: {
    question: 'İddialar somut ve kontrol edilebilir mi?',
    anchors: {
      behavioral: specificity,
      'technical-concepts': specificity,
      'system-design-lite': specificity,
    },
  },
  ownership: {
    question: 'Adayın ne yaptığı ve hangi kararları aldığı açık mı?',
    anchors: {
      behavioral: [
        'Yalnızca biz dili veya edilgen anlatım kullanılıyor; adayın kendi rolü belirsiz.',
        'Çoğunlukla biz dili kullanılıyor; kişisel katkı bir kez veya belirsiz biçimde anılıyor.',
        'Kişisel eylemler açıkça anlatılıyor; bazı takım eylemleriyle sınırlar bulanık.',
        'Kendi yaptıklarıyla başkalarının yaptıklarını açıkça ayırıyor; hatalar dâhil kararlarının sorumluluğunu alıyor.',
      ],
      'technical-concepts': technicalOwnership,
      'system-design-lite': technicalOwnership,
    },
  },
  impact: {
    question: 'Yanıt, sonuçları ve bunların etkilerini gösteriyor mu?',
    anchors: {
      behavioral: [
        'Sonuç belirtilmiyor.',
        'İyi gitti veya kullanıcılar beğendi gibi belirsiz bir sonuç veriliyor.',
        'Kısmen sayısallaştırılmış veya açık nitel bir çıktıyla somut sonuç veriliyor.',
        'Eylemlere bağlı, ölçülmüş veya doğrulanabilir bir sonuç ve sonrasında ne öğrenildiği ya da değiştirildiği anlatılıyor.',
      ],
      'technical-concepts': technicalImpact,
      'system-design-lite': technicalImpact,
    },
  },
  relevance: {
    question: 'Sorulan soruyu bu kıdem seviyesinde yanıtlıyor mu?',
    anchors: {
      behavioral: relevance,
      'technical-concepts': relevance,
      'system-design-lite': relevance,
    },
  },
  clarity: {
    question: 'Dinleyen ilk seferde anlayabiliyor mu?',
    anchors: { behavioral: clarity, 'technical-concepts': clarity, 'system-design-lite': clarity },
  },
};
export const RUBRIC_SENIORITY_NOTE_TR =
  'Kıdem: kıdemli adaylardan daha geniş kapsam, ödünleşimler ve başkaları üzerinde etki beklenir. Başlangıç seviyesindeki adaylarda gerekçe açıksa daha dar kapsam uygundur. Belirtilen kıdeme göre puanla. Türkçede özne kişi ekinden anlaşılabilir; açıkça ben dememek, kişisel katkı belliyse sorumluluk eksikliği değildir.';
export const DIMENSION_TIPS_TR: Record<Dimension, string> = {
  structure: 'Bağlamı bir cümleyle kur, yanıtın çoğunu yaptıklarına ayır ve sonuçla bitir.',
  specificity:
    'Sistemi, sayıyı ve kısıtı belirt. Tek bir somut ayrıntı, üç sıfattan daha güçlüdür.',
  ownership:
    'Kendi yaptıklarını takımın yaptıklarından ayır. Görüşmeci senin katkını anlamak istiyor.',
  impact:
    'Ölçebileceğin veya kontrol edebileceğin bir sonuçla ve bunun neyi değiştirdiğiyle bitir.',
  relevance: 'Yanıtlamadan önce soruyu içinden tekrar et; soruya hizmet etmeyen bölümleri çıkar.',
  clarity: 'Kısa cümleler kur ve yolu göster: İki sorun vardı. İlki… gibi.',
};
export function renderRubricTr(type: QuestionType): string {
  return (
    DIMENSIONS.map(
      (dimension) =>
        `${dimension} (${DIMENSION_LABELS_TR[dimension]}): ${RUBRIC_TR[dimension].question}\n${RUBRIC_TR[dimension].anchors[type].map((anchor, i) => ` ${i + 1}: ${anchor}`).join('\n')}`,
    ).join('\n\n') +
    '\n\n' +
    RUBRIC_SENIORITY_NOTE_TR
  );
}
