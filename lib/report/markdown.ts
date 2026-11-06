import { bestAnswer } from '@/lib/storage/attempts';
import { DIMENSIONS } from '@/lib/config';
import {
  DIMENSION_LABELS,
  ROLE_LABELS,
  SENIORITY_LABELS,
  QUESTION_TYPE_LABELS,
} from '@/lib/labels';
import { translatedLabels } from '@/lib/i18n/labels';
import type { MessageKey, MessageValues } from '@/lib/i18n/messages';
import { DIMENSION_TIPS } from '@/lib/feedback/rubric';
import type { SessionRecord, AnswerRecord } from '@/lib/storage/schema';
import { aggregate } from './aggregate';
export function escapeMd(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/[`*_\[\]<>#|~]/g, '\\$&')
    .replace(/^(\d+)\./, '$1\\.')
    .replace(/^[-+=]/, '\\$&');
}
export function reportFilename(session: SessionRecord) {
  return `rehearse-${session.createdAt.slice(0, 10)}-${session.setup.role}.md`;
}
export function reportMarkdown(
  session: SessionRecord,
  allAnswers: AnswerRecord[],
  translate?: (key: MessageKey, values?: MessageValues) => string,
): string {
  const m = (key: MessageKey, fallback: string) => (translate ? translate(key) : fallback);
  const labels = translate
    ? translatedLabels(translate)
    : { DIMENSION_LABELS, ROLE_LABELS, SENIORITY_LABELS, QUESTION_TYPE_LABELS };
  const answers = allAnswers.map(bestAnswer);
  const a = aggregate(answers, session.questions.length);
  const e = escapeMd;
  const summary = session.summary;
  const lines = [
    `# ${m('markdown.title', 'Rehearse session report')}`,
    '',
    `- ${m('markdown.date', 'Date')}: ${session.createdAt.slice(0, 10)}`,
    `- ${m('markdown.role', 'Role')}: ${labels.ROLE_LABELS[session.setup.role]}, ${labels.SENIORITY_LABELS[session.setup.seniority]}`,
    `- ${m('markdown.types', 'Question types')}: ${session.setup.types.map((t) => labels.QUESTION_TYPE_LABELS[t]).join(', ')}`,
    `- ${m('markdown.answered', 'Answered')}: ${answers.filter((a) => a.status === 'scored' || a.status === 'saved').length} ${m('markdown.of', 'of')} ${session.questions.length}`,
    `- ${m('markdown.seed', 'Seed')}: ${e(session.seed)} (${m('markdown.bank', 'question bank')} ${e(session.bankVersion)})`,
  ];
  if (a.overallMean !== null)
    lines.push(`- ${m('markdown.overall', 'Overall')}: ${a.overallMean.toFixed(1)} / 4`);
  if (summary)
    lines.push(
      '',
      `## ${m('markdown.summary', 'Summary')}`,
      '',
      e(summary.headline),
      '',
      e(summary.paragraph),
    );
  if (a.focus.length)
    lines.push(
      '',
      `## ${m('markdown.focus', 'Focus on these next')}`,
      '',
      ...a.focus.map(
        (d, i) =>
          `${i + 1}. **${labels.DIMENSION_LABELS[d]}** (${a.dimensionMeans[d]?.toFixed(1)} / 4): ${e(summary?.focus_notes.find((n) => n.dimension === d)?.note ?? m(`rubric.tip.${d}`, DIMENSION_TIPS[d]))}`,
      ),
    );
  lines.push(
    '',
    `## ${m('markdown.scoresByQuestion', 'Scores by question')}`,
    '',
    `| ${m('markdown.dimension', 'Dimension')} | ${session.questions.map((_, i) => `${m('markdown.questionShort', 'Q')}${i + 1}`).join(' | ')} | ${m('markdown.average', 'Average')} |`,
    `| --------- | ${session.questions.map(() => '---').join(' | ')} | ------- |`,
  );
  for (const d of DIMENSIONS)
    lines.push(
      `| ${labels.DIMENSION_LABELS[d]} | ${session.questions.map((_, i) => answers.find((a) => a.index === i)?.feedback?.scores[d].score ?? '—').join(' | ')} | ${a.dimensionMeans[d]?.toFixed(1) ?? '—'} |`,
    );
  lines.push(
    `| ${m('markdown.overall', 'Overall')} | ${a.perQuestion.map((q) => q.overall?.toFixed(1) ?? '—').join(' | ')} | ${a.overallMean?.toFixed(1) ?? '—'} |`,
    '',
    `## ${m('markdown.delivery', 'Delivery')}`,
    '',
    `- ${m('markdown.words', 'Total words')}: ${a.delivery.totalWords}`,
  );
  if (a.delivery.avgWpm !== null)
    lines.push(
      `- ${m('markdown.pace', 'Average pace')}: ${a.delivery.avgWpm} ${m('markdown.wpm', 'words per minute')}`,
    );
  lines.push(`- ${m('markdown.fillers', 'Filler words')}: ${a.delivery.totalFillers}`);
  if (a.delivery.longestPauseMs !== null)
    lines.push(
      `- ${m('markdown.pause', 'Longest pause')}: ${(a.delivery.longestPauseMs / 1000).toFixed(1)} s`,
    );
  if (summary)
    lines.push('', `## ${m('markdown.next', 'Next practice')}`, '', e(summary.next_practice));
  lines.push('', `## ${m('markdown.answers', 'Answers')}`);
  for (const [index, q] of session.questions.entries()) {
    const answer = answers.find((a) => a.index === index);
    if (!answer || !['scored', 'saved', 'skipped'].includes(answer.status)) continue;
    lines.push('', `### ${m('markdown.question', 'Question')} ${index + 1}: ${e(q.prompt)}`, '');
    lines.push(
      `${answer.attemptRecords.length} ${answer.attemptRecords.length === 1 ? m('markdown.try', 'try') : m('markdown.tries', 'tries')}`,
      '',
    );
    if (answer.status === 'skipped') {
      lines.push(m('markdown.skipped', 'Skipped.'));
      continue;
    }
    const f = answer.feedback;
    if (f)
      lines.push(
        `${labels.QUESTION_TYPE_LABELS[q.type]} · ${m('markdown.overall', 'Overall')} ${f.overall.toFixed(1)} / 4`,
        '',
      );
    lines.push(
      `**${m('markdown.yourAnswer', 'Your answer')}**`,
      '',
      ...answer.transcript.split('\n').map((line) => `> ${e(line)}`),
    );
    if (!f) {
      lines.push(
        '',
        `- ${m('markdown.words', 'Total words')}: ${answer.metrics.words}`,
        `- ${m('markdown.fillers', 'Filler words')}: ${answer.metrics.fillers.total}`,
      );
      if (answer.metrics.wpm !== null)
        lines.push(
          `- ${m('markdown.pace', 'Average pace')}: ${answer.metrics.wpm} ${m('markdown.wpm', 'words per minute')}`,
        );
      if (answer.metrics.longestPauseMs !== null)
        lines.push(
          `- ${m('markdown.pause', 'Longest pause')}: ${(answer.metrics.longestPauseMs / 1000).toFixed(1)} s`,
        );
      continue;
    }
    lines.push(
      '',
      `**${m('markdown.scores', 'Scores')}**`,
      '',
      ...DIMENSIONS.map(
        (d) =>
          `- ${labels.DIMENSION_LABELS[d]}: ${f.scores[d].score} / 4. ${e(f.scores[d].rationale)}`,
      ),
      '',
      `**${m('markdown.worked', 'What worked')}**`,
      '',
      ...f.strengths.map(
        (s) =>
          `- ${e(s.point)}${s.evidence === null ? '' : ` ${m('markdown.youSaid', 'You said:')} "${e(s.evidence)}"`}`,
      ),
      '',
      `**${m('markdown.improve', 'What to improve')}**`,
      '',
      ...f.improvements.map(
        (v, i) =>
          `${i + 1}. ${e(v.point)} ${e(v.why)} ${m('markdown.trySaying', 'Try saying:')} "${e(v.rewrite)}"`,
      ),
      '',
      `**${m('markdown.followUpQuestion', 'A likely follow-up question:')}** ${e(f.follow_up_question)}`,
      '',
      `**${m('markdown.outline', 'Outline of a strong answer')}**`,
      '',
      ...f.model_answer_outline.map((t) => `- ${e(t)}`),
    );
    for (const followUp of answer.followUpRecords) {
      lines.push(
        '',
        `#### ${m('markdown.followUp', 'Follow-up')} ${followUp.ordinal}: ${e(followUp.prompt)}`,
        '',
        ...followUp.transcript.split('\n').map((line) => `> ${e(line)}`),
      );
      if (followUp.feedback)
        lines.push(
          '',
          `${m('markdown.overall', 'Overall')} ${followUp.feedback.overall.toFixed(1)} / 4`,
          ...DIMENSIONS.map(
            (d) => `- ${labels.DIMENSION_LABELS[d]}: ${followUp.feedback?.scores[d].score} / 4`,
          ),
        );
    }
  }
  lines.push(
    '',
    '---',
    '',
    m(
      'markdown.footer',
      'Generated by Rehearse (https://rehearse.firatkil.com). Scores are a coaching aid from a language model, not a prediction of how an interviewer will judge you.',
    ),
    '',
  );
  return lines.join('\n');
}
