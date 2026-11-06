import type { MessageKey, MessageValues } from './messages';
export function translatedLabels(t: (key: MessageKey, values?: MessageValues) => string) {
  return {
    ROLE_LABELS: {
      frontend: t('labels.role.frontend'),
      backend: t('labels.role.backend'),
      'full-stack': t('labels.role.full-stack'),
      'product-engineer': t('labels.role.product-engineer'),
      'ai-product-engineer': t('labels.role.ai-product-engineer'),
    },
    SENIORITY_LABELS: {
      junior: t('labels.seniority.junior'),
      mid: t('labels.seniority.mid'),
      senior: t('labels.seniority.senior'),
    },
    QUESTION_TYPE_LABELS: {
      behavioral: t('labels.question.behavioral'),
      'technical-concepts': t('labels.question.technical-concepts'),
      'system-design-lite': t('labels.question.system-design-lite'),
    },
    ANSWER_MODE_LABELS: {
      voice: t('labels.mode.voice'),
      text: t('labels.mode.text'),
    },
    DIMENSION_LABELS: {
      structure: t('labels.dimension.structure'),
      specificity: t('labels.dimension.specificity'),
      ownership: t('labels.dimension.ownership'),
      impact: t('labels.dimension.impact'),
      relevance: t('labels.dimension.relevance'),
      clarity: t('labels.dimension.clarity'),
    },
  };
}
